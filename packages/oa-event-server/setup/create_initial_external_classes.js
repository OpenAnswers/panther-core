/*
 * Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

db.externalclasss.remove({});

// Identifier
db.externalclasss.save({
  class_name: 'example_class',
  trigger_name: 'new_example_class',
  command: '/opt/external/new_example_class.sh',
});
