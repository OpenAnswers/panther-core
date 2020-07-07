module.exports = {
  type: "external",
  each: true,
  command: "send_page",
  name: "sample_external", // optional
  update_with: "stdout", // allows external program to echo name=value pairs that are then
  // used to update the alert with
  on: {
    // objects keys are either the external commands exit code or 'default'
    0: {
      type: "internal",
      name: "pageok", // optional
      command: {
        update: { external_state: "page sent" }
      }
    },
    default: {
      type: "internal",
      name: "default",
      command: {
        update: { external_state: "page failed" }
      },
      update_with: "stderr"
    }
  }
};
