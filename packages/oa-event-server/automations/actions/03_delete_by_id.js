
module.exports = {
  type: "internal_delete",
  name: 'delete_by_id',
  criteria: function(lert){ return { _id: lert._id } },
};

