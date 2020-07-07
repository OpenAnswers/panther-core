
db.externalclasss.remove({});

// Identifier
db.externalclasss.save( { class_name:'oatime', trigger_name:'new_oatime', command:'/raid/oaec/external/new_oatime.sh' } );

