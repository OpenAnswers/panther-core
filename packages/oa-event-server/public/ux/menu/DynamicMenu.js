Ext.define("Ext.ux.menu.DynamicMenu",{
        extend:"Ext.menu.Menu",
        alias:'widget.dynamicfiltermenu',
        loaded:false,
        loadMsg:'Loading...',
        initComponent:function(){
                var me=this;
                me.callParent(arguments);
                me.store=Ext.getStore(this.store);
                me.on('show',me.onMenuLoad,me);
                listeners={
                        scope:me,
                        load:me.onLoad,
                        beforeload:me.onBeforeLoad
                };
                me.mon(me.store,listeners);
        },
        onMenuLoad:function(){var me=this;me.store.load();},
        onBeforeLoad:function(store){this.updateMenuItems(false);},
        onLoad:function(store,records){this.updateMenuItems(true,records);},
        updateMenuItems:function(loadedState,records){
                var me=this;
                me.removeAll();
                if(loadedState){
                        me.setLoading(false,false);
                        Ext.Array.each(records,function(item,index,array){
                          //console.log( 'record: ',  item );
                          item.raw.handler = function(){ console.log( item.raw.id + ' handler: ' + item.raw.handler_name || '' ); }
                          me.add(item.raw);
                        });
                }
                else{
                        me.add({width:75,height:40});
                        me.setLoading(me.loadMsg,false);
                }
                me.loaded=loadedState;
        }
});
