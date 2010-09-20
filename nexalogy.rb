require 'rubygems'

# we moved to the newest Bundler gem approach to running sinatra
require 'bundler/setup'

require 'sinatra'
require 'haml'
require 'json'
require 'fileutils'
require 'active_record'
require 'ken'

conn = ActiveRecord::Base.establish_connection(
    :adapter  => "mysql",
    :host     => "localhost",
    :username => "root",
    :password => "wong911",
    :database => "nexalogy_relaxation"
)

ActiveRecord::Base.logger = Logger.new(STDOUT)
#ActiveRecord::Migration.verbose = true

class Node < ActiveRecord::Base
  private
  
  # id is a protected attribute by default, so to allow us to write ID, we set them all to nothing... hehehe
  def attributes_protected_by_default
    []
  end
end

class Edge < ActiveRecord::Base
end

# custom extensions to the DSL, providing new instance methods
require File.dirname(__FILE__) + '/lib/nexalogy_sinatra'

set :logging, false
set :run, false

SENTIMENTS = "#{File.dirname(__FILE__)}/config/sentiments.csv"
SENTIMENT_DEFINITIONS = "#{File.dirname(__FILE__)}/config/sentiments.yml"

get '/' do
  haml :index
end


# read the provided relaxation study data, and insert it into MySQL
get '/json2MySQL' do
  content_type :json
  conn.connection.execute("truncate table nodes")
  conn.connection.execute("truncate table edges")
  file = File.read(File.join(File.dirname(__FILE__), "public", "javascripts", "200.js"))
  json = JSON.parse(file)
  json.each do |a|
    node = {}
    valid_fields = %w(id name)
    a.each_pair do |key, val|
      node[key] = val if valid_fields.include?(key)
      if key == 'adjacencies'
        create_links(val)
      end
    end
    Node.create({:id => node["id"], :label => node["name"], :group => 0})
  end
  {:result => 'good to go'}.to_json
end

# dump out the nodes in the database
get '/nodes' do
  @nodes = Node.all
  haml :nodes
end

# dump out the edges in the database
get '/edges' do
  @edges = Edge.all
  haml :edges
end

# we might have a question about a node, so we can figure out a response from this
get '/graph_query' do
  treemap_callback if params[:type] = 'treemap'
end

get '/docs' do
  File.read(File.join('public','doc','index.html'))
end

# we can use Ken to ask Freebase for interesting tidbits about a keyword
get '/freebase' do
  begin
    data = {}
    content_type :json
    t = Ken::Topic.get("/en/#{params[:keyword]}");
    puts "T is #{t.url}\n#{t.name}\n#{t.description}\n#{t.aliases}\n"
    webpages = formatLinks(t.webpages) || ""
    unless t.url.nil?
      url = '<a href="'+t.url+'" target="_blank">' + t.url + "</a>"
    else
      url = ""
    end
    
    unless t.thumbnail.nil?
      thumbnail = '<img src="'+t.thumbnail+'" />'
    else
      thumbnail = ""
    end
    
    data.merge!({
      :name => t.name,
      :description => t.description,
      :aliases => t.aliases,
      :webpages => webpages,
      :url => url,
      :thumbnail => thumbnail
    })
  rescue StandardError => error
    puts "error #{error.inspect}\n"
    data.merge!({
      :name => "",
      :description => "Freebase has nothing on that keyword!",
      :aliases => "",
      :webpages => "",
      :url => "",
      :thumbnail => ""
    })
  end
  {:data => data}.to_json
end

# run some sentiment analysis on a CSV file, which obviously has to reside on the filesystem
get '/sentiments' do
  require 'fastercsv'
  content_type :json
  results = {}    # send back the sentiments and their respective count in this Hash
  
  # read some CSV file and extract the sentiments contained inside it
  if(!FileTest.exist?(SENTIMENTS))
    raise StandardError.new('Sentiments data file does not exist.')
  end
  if(!FileTest.exist?(SENTIMENT_DEFINITIONS))
    raise StandardError.new('Sentiment definitions data file does not exist.')
  end
  definitions = YAML.load(File.read(SENTIMENT_DEFINITIONS))
  
  # open the CSV file and see if we find the definitions we're looking for
  csv = FasterCSV.read(SENTIMENTS, {:encoding => 'ISO-8859-1', :quote_char => "{", :col_sep => ","})
  header = csv.first
  
  # for each key in the definitions, there should be a corresponding column in the CSV
  definitions[:sentiments].each do |d|
    key = d.first.capitalize
    if header.include?(key)
      results[key] = 0
    end
  end
  
  count = 0
  # So, step through the CSV now, adding up the numbers so we can graph them
  FasterCSV.foreach(SENTIMENTS,{:encoding => 'ISO-8859-1', :headers => true, :quote_char => "{", :col_sep => ","}) do |row|
    # we have a row, so now, iterate through the needed sentiment definitions
    count += 1
    row.each do |f|
      # f.first is the column name
      # f.last is the row value in that column
      results[f.first] += f.last.to_i unless results[f.first].nil?
    end
  end
  
  cleaned = {}
  results.map {|r| cleaned[r.first] = r.last if r.last > 0}
  
  {:data => {:sentiments => cleaned}}.to_json
end

get '/tone' do
  content_type :json
  {:data => {:tone_analysis => "all good"}}.to_json
end

get '/graph' do
  # setup the method to return the right data
  size = params[:size].to_i ||= nil
  raise StandardError.new "No Size Parameter" if size.nil? 
  
  # we want to render JSON
  content_type :json
  
  case size
    when 0
      file = File.join(File.dirname(__FILE__), "public","javascripts","word_coword.js")
      raise StandardError.new "No word_coword data found." unless File.exist?(file)
    when 50
      file = File.join(File.dirname(__FILE__), "public","javascripts","50.js")
      raise StandardError.new "No 50 node data found." unless File.exist?(file)
    when 200
      file = File.join(File.dirname(__FILE__), "public","javascripts","200.js")
      raise StandardError.new "No 50 node data found." unless File.exist?(file)
    else
      raise StandardError.new "Someone asked for Nonsense.. no valid Size."
  end
  f = File.new(file,'r')
  data = ""
  while line = f.gets
    data += line 
  end
  {:data => data}.to_json
end
  
get '/special/?' do
  haml_special :'layouts/slider', :'layouts/protovis_examples' 
end

def create_links(data)
  data.each do |node|
    Edge.create({
      :source => node["nodeFrom"],
      :target => node["nodeTo"],
      :label => node["cij"]
    })
  end
end

def formatLinks(links)
    if links.length == 0 
      return nil
    end
    result = "<ul>"
    links.each do |link|
      puts "link #{link.inspect}"
      result += '<li><a href="' + link['url'] + '" target="_blank">'+link['text']+"</a></li>"
    end
    result += "</ul>"
    puts "Returning #{result}\n"
    result
end

def haml_special(template, layout, options={})
  haml template, options.merge(:layout => layout)
end

