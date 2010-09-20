require 'rubygems'
require 'ap'
require 'fastercsv'
require 'lymbix'

namespace :nexalogy do
  desc "Use Lymbix ToneAPI to get the tone of the descriptions from the sentiments CSV file found in the config"
  task :tone_analysis do
     Nexalogy::Base.tone_analysis
  end
end

# simple alias so nexalogy becomes nex
namespace :nex do
  desc "Use Lymbix ToneAPI to get the tone of the descriptions from the sentiments CSV file found in the config"
  task :csv2tone => "nexalogy:tone_analysis"

module Nexalogy
  module Base
    
    SENTIMENTS = "#{APP_ROOT}/config/sentiments.csv"
    TONE_ANALYSIS = "#{APP_ROOT}/config/tone_analysis.yaml"
    
    def self.tone_analysis
      require 'fastercsv'
      @lymbix = Lymbix::Base.authenticate('dlazar@resistorsoftware.com', 'tone911', 18508)

      # read some CSV file and extract the sentiments contained inside it
      if(!FileTest.exist?(SENTIMENTS))
        raise StandardError.new('Sentiments data file does not exist.')
      end

      # open the CSV file and see if we find the definitions we're looking for
      csv = FasterCSV.read(SENTIMENTS, {:encoding => 'ISO-8859-1', :quote_char => "{", :col_sep => ","})

      # So, step through the CSV now, adding up the numbers so we can graph them
      tone_analysis = []
      counter = 0
      FasterCSV.foreach(SENTIMENTS,{:encoding => 'ISO-8859-1', :headers => true, :quote_char => "{", :col_sep => ","}) do |row|
        # we have a row, so now, iterate through the needed sentiment definitions
        row.each do |f|
          # f.first is the column name
          # f.last is the row value in that column
          if f.first == 'description'
            article = f.last.gsub(/<b>|<\/b>/,"")
            tone_analysis << @lymbix.tonalize_article(article) 
            puts "Row #{counter += 1}: #{article}\n"
          end
        end      
      end
      f = File.open(TONE_ANALYSIS,'w')
      YAML.dump(tone_analysis, f)
      f.close
    end
    
  end
end