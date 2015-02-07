require 'json'
require 'securerandom'
require 'erb'

module D3
  def self.init
    self.init_iruby
    @@callbacks = {}
    @@comm = IRuby::Comm.new("d3rb")
    @@comm.open
    @@comm.on_msg(Proc.new do |msg|
      # msg: {type: "sync", proc_uuid: "u-u-i-d", callback_uuid: "u-u-i-d", data: []}
      callback = D3.get_callback(msg[:proc_uuid])
      contents = msg[:data].map{|d| callback.call(d)}
      msg = {
        type: "sync",
        target: msg[:callback_uuid],
        contents: contents
      }
      @@comm.send(msg)
    end)
  end

  def self.comm
    @@comm
  end

  def self.init_iruby
    path = File.expand_path("../template.js", __FILE__)
    template = File.read(path)
    js = ERB.new(template).result(binding)
    IRuby.display(IRuby.javascript(js))
  end

  # D3.select(".main").
  #
  def self.select_(type, selection)
    uuid = SecureRandom.uuid
    msg = {
      type: type,
      uuid: uuid,
      target: "d3",
      arg: selection
    }
    @@comm.send(msg)
    return D3::Selection.new(uuid)
  end

  def self.selectAll(selection)
    self.select_("selectAll", selection)
  end

  def self.select(selection)
    self.select_("select", selection)
  end

  def self.register_callback(uuid, callback)
    @@comm[uuid] = callback
  end

  def self.get_callback(uuid)
    @@comm[uuid]
  end

  class Selection
    def initialize(uuid)
      @uuid = uuid
      @stack = []
    end

    # @example
    # data = [{x: 1, y: 2}, {x: 2, y: 3}]
    # D3.selectAll(".main")
    #   .data(data)
    #   .append("rect")
    #   .attr("x", lambda {|d| d.x})
    #   .attr("y", lambda {|d| d.y})
    #
    def method_missing(name, *args)
      args = args.map do |arg|
        if arg.is_a? Proc
          uuid = SecureRandom.hex
          register_callback(uuid, arg)
          {type: "Proc", sync: true, uuid: uuid}.to_json
        else
          arg
        end
      end
      @stack.push({name: name, args: args})
      self
    end

    def run
      msg = {
        type: "parse",
        target: @uuid,
        stack: @stack
      }
      D3.comm.send(msg)
    end
  end

  init if defined? IRuby
end
