module.exports = {
  async up(db, client) {
    await db.createCollection('alertmatches');
    const result = await db
      .collection('alertmatches')
      .indexExists('identifier_1');
    if (result === false) {
      await db
        .collection('alertmatches')
        .createIndex(
          { identifier: 1 },
          { name: 'identifier_1', uniq: true, background: true }
        );
    }
  },

  async down(db, client) {
    await db.collection('alertmatches').dropIndex('identifier_1');
  },
};
