let Ajv = require('ajv');
let ajv = new Ajv({ allErrors: true, jsonPointers: true, useDefaults: true });

require('ajv-errors')(ajv);

let schema = {
    "$id": "https://panther.support/schemas/http-event.json",
    "type": "object",
    "errorMessage": {
        "required": {
            "event": "Must have a property event"
        }
    },
    "required": ["event"],
    "properties": {
        "event": {
            "type": "object",
            "additionalProperties": { "type": "string" },
            "errorMessage": {
                "type": "event must be an object",
                "required": "Fields required [node,summary]",
                "additionalProperties": "Must be of type string",
            },
            "required": ["node", "summary"],
            "patternProperties": {
                "^([_]*id|agent|group|tally|state_change|last_occurrence|first_occurrence)$": {
                    "not": {},
                    "errorMessage": "Fields not allowed [_id,id,agent,group,tally,state_change,last_occurrence,first_occurrence]"
                }
            },
            "properties": {
                "node": {
                    "type": "string",
                    "minLength": 1,
                    "errorMessage": {
                        "minLength": "Node field should have a value",
                        "type": "Node field should be a string"
                    }
                },
                "tag": {
                    "type": "string",
                    "errorMessage": {
                        "type": "Tag field should be a string"
                    }
                },
                "summary": {
                    "type": "string",
                    "minLength": 1,
                    "errorMessage": {
                        "type": "Summary must be a string",
                        "minLength": "Summary field should have a value"
                    }
                },
                "severity": {
                    "type": "integer",
                    "default": 1,
                    "minimum": 0,
                    "maximum": 5,
                    "errorMessage": "Severity should be between 0 and 5"
                },
            }
        }
    }
}

let validator = ajv.compile(schema);

module.exports = validator