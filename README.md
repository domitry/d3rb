# D3.rb

A Ruby wrapper for d3.js

![](http://i.gyazo.com/d3a73cfb641572ab4354d8b24d89082a.gif)

## Dependency
*IRuby latest

## example
```ruby
require 'd3'

D3.select("#header")
  .append("svg")
  .style("height", "100px")
  .selectAll("rect")
  .data([1,2,3])
  .enter
  .append("rect")
  .run
```
