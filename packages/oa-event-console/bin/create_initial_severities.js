//
// Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.

db.severities.remove({ system: true });

// Identifier
db.severities.save({ value: 0, label: 'Clear', background: '#AAFFAA', foreground: '#333333', system: true });
db.severities.save({ value: 1, label: 'Indeterminate', background: '#DBA7D9', foreground: '#333333', system: true });
db.severities.save({ value: 2, label: 'Warning', background: '#8CC2FF', foreground: '#333333', system: true });
db.severities.save({ value: 3, label: 'Minor', background: '#FFF6A5', foreground: '#333333', system: true });
db.severities.save({ value: 4, label: 'Major', background: '#FFB689', foreground: '#333333', system: true });
db.severities.save({ value: 5, label: 'Critical', background: '#FF7A7A', foreground: '#333333', system: true });
