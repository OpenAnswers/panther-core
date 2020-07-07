/*
 * find any cleared alerts then delete them
 */
module.exports = {
  query: { severity: 0 }, // condition to search for
  action: "delete", // delete anything that matches the condition
  when: { periodic: 15 }, // run the query every fifteen seconds
  activated: true // set the trigger to be active
};
