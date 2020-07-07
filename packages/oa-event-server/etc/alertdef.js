/*
 * {
 *  priority: <char> ( M = Must have, S = Should have, C = could have )
 * }
 */
exports.columns = [
  /*
   * (M)ust have these fields set at time of alert creation
   */
  {
    name: "identifier",
    priority: "M",
    alias: "ident",
    type: "String",
    label: "Identifier",
    width: "100",
    uniq: true
  },
  {
    name: "node",
    priority: "M",
    alias: "n",
    type: "String",
    label: "Node name",
    width: "40"
  },
  {
    name: "severity",
    priority: "M",
    alias: "s",
    type: "Number",
    label: "Severity",
    width: "30",
    idx: true
  },
  {
    name: "tag",
    priority: "S",
    alias: "tag",
    type: "String",
    label: "Tag",
    width: "40"
  },
  {
    name: "summary",
    priority: "M",
    alias: "msg",
    type: "String",
    label: "Summary",
    width: "120"
  },
  {
    name: "state_change",
    priority: "C",
    alias: "sc",
    type: "Date",
    display_type: "Date",
    label: "Last Changed",
    width: "140",
    idx: true
  },
  /*
   * (S)hould have these fields set at time of alert creation
   * 
   */
  {
    name: "agent",
    priority: "S",
    alias: "ag",
    type: "String",
    label: "Agent",
    width: "60"
  },
  {
    name: "first_occurrence",
    priority: "S",
    alias: "fo",
    type: "Date",
    display_type: "Date",
    label: "Creation time",
    width: "140"
  },
  /*
   * (C)ould have these fields set at time of alert creation
   */
  {
    name: "group",
    priority: "C",
    alias: "gr",
    type: "String",
    label: "Group",
    width: "60",
    idx: true
  },
  {
    name: "owner",
    priority: "C",
    alias: "u",
    type: "String",
    label: "Owner",
    width: "60"
  },
  {
    name: "tally",
    priority: "C",
    alias: "t",
    type: "Number",
    label: "Tally",
    width: "40"
  },
  {
    name: "acknowledged",
    priority: "C",
    alias: "ack",
    type: "Boolean",
    label: "Ack",
    default: false,
    width: "10"
  },
  {
    name: "last_occurrence",
    priority: "C",
    alias: "lo",
    type: "Date",
    display_type: "Date",
    label: "Last Happened",
    width: "140"
  },
  {
    name: "external_id",
    priority: "C",
    alias: "ex",
    type: "String",
    label: "External ID",
    width: "90"
  }
];
