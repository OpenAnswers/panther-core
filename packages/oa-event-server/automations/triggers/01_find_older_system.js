/*
 * defined a function to compute a relative time, 
 * this can then be used from within the actual query below
 */
var one_minute_ago = function() {
  var t = new Date();

  var tt = t.setMinutes(t.getMinutes() - 1);
  console.log("T MINUS ONE MINUTE: " + tt);
  return tt;
};

/*
 * find any cleared alerts 
 * AND have an owner 
 * AND have been acknowledged 
 * AND have not occured within the last two hours
 * then run the default delete action against them to purge them from the database
 */

module.exports = {
  query: { severity: 0, owner: "system", acknowledged: true, last_occurrence: { $lt: one_minute_ago() } },
  action: "delete",
  when: { periodic: 13 },
  activated: false
};
