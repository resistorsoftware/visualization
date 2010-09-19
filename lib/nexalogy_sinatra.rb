# register some new functions that we can access in the processing of data
# D. Lazar
# August 30, 2010

require 'sinatra/base'

module Sinatra
  module Nexalogy
    def treemap_callback
      {:data => {:treemap => 'I am a treenode monkey'}}.to_json
    end
  end
  
  # add the Nexalogy methods to the application for use in the DSL
  helpers Nexalogy
  
end