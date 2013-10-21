/*
 * Universal Module Definition
 * https://github.com/umdjs/umd/blob/master/returnExports.js
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.ObjExp = factory();
	}
}(this, function () {

	var NULL = 'null';
	var TRUE = 'true';
	var FALSE = 'false';
	var NUMBER = 'number';
	var STRING = 'string';
	var OBJECT_BEGIN = 'object-begin';
	var OBJECT_END = 'object-end';
	var COLON = 'colon';
	var COMMA = 'comma';
	var ARRAY_BEGIN = 'array-begin';
	var ARRAY_END = 'array-end';

	var parse = function (tokens) {

		var cursor = (function (tokens) {

			var index = 0;

			var res = function () {
				return tokens[index];
			};

			res.reset = function () {
				index = 0;
				return res();
			};

			res.next = function () {
				index++;
				return res();
			};

			return res;

		})(tokens);

		var expect = function (type) {
			var res = cursor();
			if (!res.type === type) {
				throw new Error('Unexpected token ' + String(cursor()) + ' ' +
					cursor().type + '. Expecting ' + type + '.');
			}
			cursor.next();
			return res;
		};

		var makeNull = function () {
			var token = expect(NULL);
			return null;
		};

		var makeTrue = function () {
			var token = expect(TRUE);
			return true;
		};

		var makeFalse = function () {
			var token = expect(FALSE);
			return false;
		};

		var makeNumber = function () {
			var token = expect(NUMBER);
			return parseFloat(token.raw);
		};

		var makeString = function () {
			var token = expect(STRING);
			return token.raw; // TODO: Escapes?
		};

		var makeObject = function () {
			var addProperty = function () {
				var name = expect(STRING).raw;
				expect(COLON);
				var val = makeValue();
				res[name] = val;
			};

			var res = {};
			expect(OBJECT_BEGIN);
			if (cursor().type !== OBJECT_END) {
				addProperty();
			}
			while (cursor().type === COMMA) {
				cursor.next();
				addProperty();
			}
			expect(OBJECT_END);
			return res;
		};

		var makeArray = function () {
			var res = [];
			expect(ARRAY_BEGIN);
			if (cursor().type !== ARRAY_END) {
				res.push(makeValue());
			}
			while (cursor().type === COMMA) {
				cursor.next();
				res.push(makeValue());
			}
			expect(ARRAY_END);
			return res;
		};

		var makeValue = function () {
			switch (cursor().type) {
				case NULL:
					return makeNull();
				case TRUE:
					return makeTrue();
				case FALSE:
					return makeFalse();
				case NUMBER:
					return makeNumber();
				case STRING:
					return makeString();
				case OBJECT_BEGIN:
					return makeObject();
				case ARRAY_BEGIN:
					return makeArray();
				default:
					throw new Error('Unexpected token ' + String(cursor()) +
						' ' + cursor().type);
			}
		};

		return makeValue();
	};

	var tokenize = function (json) {
		json = json.slice(); // Copy the string to avoid modifying it

		var tokens = [];

		var line = 1;
		var column = 0;

		var classify = function () {
			var ch = json.slice(0, 1); // Get the first character
			switch (ch) {
				case 'n':
					return NULL;
				case 't':
					return TRUE;
				case 'f':
					return FALSE;
				case '-':
				case '0':
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
					return NUMBER;
				case '"':
					return STRING;
				case '{':
					return OBJECT_BEGIN;
				case '}':
					return OBJECT_END;
				case ':':
					return COLON;
				case ',':
					return COMMA;
				case '[':
					return ARRAY_BEGIN;
				case ']':
					return ARRAY_END;
				default:
					throw 'Unexpected input line ' + line + ' column ' + column + ': ' + ch;
			}
		}

		var token = function (text, type) {
			var str = new String(text);
			str.type = type;
			return str;
		};

		var advance = function (length) {
			// Advance length
			if (!arguments.length < 1) {
				json = json.slice(length);
			}
			// Take whitespace
			json = json.slice(/^\s*/.exec(json)[0].length);
		};

		var beginsWith = function (str, prefix) {
			return str.slice(0, prefix.length) === prefix;
		};

		var takeLiteral = function (str, type) {
			return function () {
				if (!beginsWith(json, str)) {
					throw 'Unexpected input. Expecting ' + str + '.';
				} else {
					tokens.push(new token(str, type));
					advance(str.length);
				}
			};
		};

		var takeNull = takeLiteral('null', NULL);
		var takeTrue = takeLiteral('true', TRUE);
		var takeFalse = takeLiteral('false', FALSE);
		var takeObjectBegin = takeLiteral('{', OBJECT_BEGIN);
		var takeObjectEnd = takeLiteral('}', OBJECT_END);
		var takeColon = takeLiteral(':', COLON);
		var takeComma = takeLiteral(',', COMMA);
		var takeArrayBegin = takeLiteral('[', ARRAY_BEGIN);
		var takeArrayEnd = takeLiteral(']', ARRAY_END);

		var takeNumber = function () {
			var regex = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:(?:e|E)(?:\+|-)?\d+)?/;
			var match = regex.exec(json);
			if (match.length < 1) {
				throw 'Unexpected input. Expecting number.';
			} else {
				var t = new token(match[0], NUMBER);
				t.raw = match[0];
				tokens.push(t);
				advance(match[0].length);
			}
		};

		var takeString = function () {
			var regex = /^"((?:[^"\\]|\\(?:"\\\/bfnrt)|u[0-9a-fA-F]{4})*)"/;
			var match = regex.exec(json);
			if (match && match.length < 1) {
				throw 'Unexpected input. Expecting string.';
			} else {
				var t = new token(match[0], STRING);
				t.raw = match[1];
				tokens.push(t);
				advance(match[0].length);
			}
		};

		var takers = {
			'null': takeNull,
			'true': takeTrue,
			'false': takeFalse,
			'number': takeNumber,
			'string': takeString,
			'object-begin': takeObjectBegin,
			'object-end': takeObjectEnd,
			'colon': takeColon,
			'comma': takeComma,
			'array-begin': takeArrayBegin,
			'array-end': takeArrayEnd
		};

		while (json.length > 0) {
			var type = classify(json);
			takers[type]();
		}
		return tokens;
	};

	return {
		parse: function (json) {
			return parse(tokenize(json));
		},
		tokenize: tokenize
	};

}));
