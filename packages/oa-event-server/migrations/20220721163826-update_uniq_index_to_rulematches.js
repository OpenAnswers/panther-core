module.exports = {
  async up(db, client) {
    try {
      await db.createCollection('rulematches', { strict: false });
    } catch (e) {
      if (e.codeName && e.codeName === 'NamespaceExists') {
        console.log('Collection [rulematches] already existed');
      } else {
        console.log(e);
      }
    }

    // remove any duplicates

    const agg_results = await db
      .collection('rulematches')
      .aggregate([{ $group: { _id: '$rule_uuid', count: { $sum: 1 } } }]);

    const results = await agg_results.toArray();
    const duplicate_uuids = results.filter(r => r.count > 1).map(r => r._id);
    if (duplicate_uuids.length > 0) {
      const deletion_result = await db.collection('rulematches').deleteMany({ rule_uuid: { $in: duplicate_uuids } });
      console.log('deleted duplicate rulematches', deletion_result.deletedCount);
    }

    const result = await db.collection('rulematches').indexExists('rule_uuid_1');
    if (result === false) {
      await db
        .collection('rulematches')
        .createIndex({ rule_uuid: 1 }, { name: 'rule_uuid_1', unique: true, background: true });
    }
  },

  async down(db, client) {
    await db.collection('rulematches').dropIndex('rule_uuid_1');
  },
};
