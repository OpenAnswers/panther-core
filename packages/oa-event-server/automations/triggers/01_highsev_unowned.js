module.exports = {
  query: { severity: { $gte: 5 }, owner: { $ne: "vince" } },

  action: {
    columns: "*",
    execute: "sample_external"
  },

  when: { periodic: 17 },
  activated: false
};
