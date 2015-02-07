require.config({paths: {
    d3: "http://d3js.org/d3.v3.min",
    "underscore": "http://underscorejs.org/underscore-min",
    "uuid": "https://cdn.rawgit.com/broofa/node-uuid/master/uuid"
}});

require(["d3", "underscore", "uuid"], function(d3, _, node_uuid){
    var selection = {};
    var callbacks = {};

    function register_selection(uuid, s){
        selection[uuid] = s;
    }

    function get_selection(uuid){
        console.log("registered_selection", selection);
        if(_.isUndefined(selection[uuid]))throw "Unregistered selection";
        return selection[uuid];
    }

    function register_callback(uuid, callback){
        callbacks[uuid] = callback;
    };

    function get_callback(uuid){
        if(_.isUndefined(callbacks[uuid]))throw "Unregistered callback";
        return callbacks[uuid];
    }

IPython.notebook.kernel.comm_manager.register_target("d3rb", function(comm, msg){
        // stack: [{name: "attr", args: [{type: "Proc", sync: true, uuid: ""}]}]
        var parse = function(target, stack){
            // row: {name: "attr", args: ["width", {type: Proc}]}
            if(stack.length == 0)return;
            var row = stack.shift();
            var method_name = row.name, args = row.args;

            // args: 
            if(method_name == "attr"){
                if(args.length == 1 && _.isObject(args) && args[0].sync == true){
                    var arg = args[0];
                    var new_uuid = node_uuid.v4();

                    comm.send("sync", {
                        proc_uuid: arg.uuid,
                        callback_uuid: new_uuid
                    });

                    register_callback(new_uuid, function(obj){
                        parse(
                            target["attr"].apply(target, [function(d, i){
                                return obj[i];
                            }]), stack);
                    });
                    return;
                }
            }else{
                console.log("target.apply", target, method_name, args);
                var new_target = target[method_name].apply(target, args);
                parse(new_target, stack);
            }
        };

        comm.on_msg(function(msg_){
            console.log("msg has come. ", msg_);
            var msg = msg_.content.data;

            switch(msg.type){
            case "select":
                /*
                 msg: {
                 type: "select",
                 uuid: "u-u-i-d",
                 target: "d3",
                 arg: "#hoge"
                 }
                 */
                if(msg.target == "d3"){
                    register_selection(msg.uuid, d3[msg.type](msg.arg));
                }else{
                    var target = get_selection(msg.target);
                    register_selection(msg.uuid, target[msg.type](msg.arg));
                }
                break;
            case "parse":
                /*
                 msg: {
                 type: "parse",
                 target: "u-u-i-d",
                 stack: [{name: "data", args: [[0,1,2]]}, {name: "attr", args: ["width", {type: Proc}]}]
                 }
                 */
                parse(get_selection(msg.target), msg.stack);
                break;
            case "sync":
                /*
                 msg: {
                 type: "sync"
                 target: "u-u-i-d",
                 contents: []
                 }
                 */
                var cb = get_callback(msg.target);
                cb(msg.contents);
                break;
            }
        });
    });
});
