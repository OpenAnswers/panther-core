//
// Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

/*
 * find any cleared alerts then delete them
 */
module.exports = {
  query: { severity: 0 }, // condition to search for
  action: "delete", // delete anything that matches the condition
  when: { periodic: 15 }, // run the query every fifteen seconds
  activated: true // set the trigger to be active
};
