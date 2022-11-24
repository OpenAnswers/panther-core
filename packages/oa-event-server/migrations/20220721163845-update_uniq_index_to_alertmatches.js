module.exports = {
  async up(db, client) {
    try {
      await db.createCollection('alertmatches');
    } catch (e) {
      if (e.codeName && e.codeName === 'NamespaceExists') {
        console.log('Collection [alertmatches] already existed');
      } else {
        console.log(e);
      }
    }

    // remove any duplicates

    const agg_results = await db
      .collection('alertmatches')
      .aggregate([{ $group: { _id: '$identifier', count: { $sum: 1 } } }]);

    const results = await agg_results.toArray();
    const duplicate_identifiers = results.filter(r => r.count > 1).map(r => r._id);
    if (duplicate_identifiers.length > 0) {
      const deletion_result = await db
        .collection('alertmatches')
        .deleteMany({ identifier: { $in: duplicate_identifiers } });
      console.log('deleted duplicate alertmatches: ', deletion_result.deletedCount);
    }

    const result = await db.collection('alertmatches').indexExists('identifier_1');
    if (result === false) {
      await db
        .collection('alertmatches')
        .createIndex({ identifier: 1 }, { name: 'identifier_1', unique: true, background: true });
    }
  },

  async down(db, client) {
    await db.collection('alertmatches').dropIndex('identifier_1');
  },
};
