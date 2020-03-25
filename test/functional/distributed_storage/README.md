## Distributed storage testing


For each operation there must be done system tests when supported:

* mongo
* sql


Tests must be for node combinations:

* running on single localy used node (file: on_local_node)
* running on multiple nodes (file: on_multi_nodes)
* running on single remote node in multinode network (file: on_remote_node)


Test the different result output options:

* map
* only_value
* embed_nodeId
* raw


Operations are

* find / findOne
* save
* remove
  * direct object remove
  * remove by condition
* update
* aggregate - works currently only for mongodb


