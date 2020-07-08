module.exports = {
  async up(db, client) {
    await db.createCollection('rulematches');
    const result = await db
      .collection('rulematches')
      .indexExists('rule_uuid_1');
    if (result === false) {
      await db
        .collection('rulematches')
        .createIndex(
          { rule_uuid: 1 },
          { name: 'rule_uuid_1', uniq: true, background: true }
        );
    }
  },

  async down(db, client) {
    await db.collection('rulematches').dropIndex('rule_uuid_1');
  },
};
