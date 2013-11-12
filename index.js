(function (root, factory) {
	/*
	 * Universal Module Definition
	 * https://github.com/umdjs/umd/blob/master/returnExports.js
	 */
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.ObjExp = factory();
	}
}(this, function () {

	var Tokens = {
		NULL:         0x01,
		TRUE:         0x02,
		FALSE:        0x03,
		COLON:        0x04,
		COMMA:        0x05,
		STRING:       0x06,
		NUMBER:       0x07,
		BEGIN_ARRAY:  0x08,
		END_ARRAY:    0x09,
		BEGIN_OBJECT: 0x0a,
		END_OBJECT:   0x0b,
		PROPERTY:     0x11,
		PROPERTIES:   0x12,
		OBJECT:       0x13,
		ELEMENTS:     0x14,
		ARRAY:        0x15,
		VALUE:        0x16
	};
	Object.keys(Tokens).forEach(function (key) {
		this[key] = Tokens[key];
	}, this);

	var TokenNames = {}
	TokenNames[NULL] = 'null';
	TokenNames[TRUE] = 'true';
	TokenNames[FALSE] = 'false';
	TokenNames[COLON] = 'colon';
	TokenNames[COMMA] = 'comma';
	TokenNames[STRING] = 'string';
	TokenNames[NUMBER] = 'number';
	TokenNames[BEGIN_ARRAY] = 'begin-array';
	TokenNames[END_ARRAY] = 'end-array';
	TokenNames[BEGIN_OBJECT] = 'begin-object';
	TokenNames[END_OBJECT] = 'end-object';

	var tokenize = function (json) {
		json = json.slice(); // Copy string

		var index = 0;
		var tokens = [];

		function classify (ch) {
			switch (ch) {
				case 'n': return NULL;
				case 't': return TRUE;
				case 'f': return FALSE;
				case ':': return COLON;
				case ',': return COMMA;
				case '"': return STRING;
				case '[': return BEGIN_ARRAY;
				case ']': return END_ARRAY;
				case '{': return BEGIN_OBJECT;
				case '}': return END_OBJECT;
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
				default:
					throw 'Unexpected character ' + ch;
			}
		}

		function isUnicodeControlCharacter (ch) {
			return (0 <= ch && ch <= 0x1f);
		}

		function takeLiteral(type, literal) {
			return function () {
				var value = '';
				for (var i = 0; i < literal.length; i++) {
					value += json[index++];
					if (value[i] != literal[i]) throw 'Unexpected input ' + value;
				}
				return {
					type: type,
					value: value
				};
			};
		}

		var take = {}
		take[NULL] = takeLiteral(NULL, 'null');
		take[TRUE] = takeLiteral(TRUE, 'true');
		take[FALSE] = takeLiteral(FALSE, 'false');
		take[COLON] = takeLiteral(COLON, ':');
		take[COMMA] = takeLiteral(COMMA, ',');
		take[BEGIN_ARRAY] = takeLiteral(BEGIN_ARRAY, '[');
		take[END_ARRAY] = takeLiteral(END_ARRAY, ']');
		take[BEGIN_OBJECT] = takeLiteral(BEGIN_OBJECT, '{');
		take[END_OBJECT] = takeLiteral(END_OBJECT, '}');
		take[STRING] = function () {
			var value = '"';

			if (!json[index++] === '"') throw 'Unexpected ' + json[index] + ' at ' + index;

			while (json[index] !== '"') {
				if (0 <= json.charCodeAt(index) && json.charCodeAt(index) <= 0x1f) {
					throw 'Unicode control character not allowed in string';
				} else if (json[index] === '\\') {
					index++;
					switch (json[index]) {
						case '"':
							value += '"';
							index++;
							break;
						case '\\':
							value += '\\'
							index++;
							break;
						case '/':
							value += '/';
							index++;
							break;
						case 'b':
							value += '\b';
							index++;
							break;
						case 'f':
							value += '\f';
							index++;
							break;
						case 'n':
							value += '\n';
							index++;
							break;
						case 'r':
							value += '\r';
							index++;
							break;
						case 't':
							value += '\t';
							index++;
							break;
						case 'u':
							// Followed by 4 unicode chars
							var code = 0;
							for (var i = 0; i < 4; i++) {
								code = code * 16 + '0123456789abcdef'.indexOf(json[index++]);
							}
							value += String.fromCharCode(code);
							break;
					}
				} else { // All other characters
					value += json[index++];
				}
			}

			if (!json[index++] === '"') throw 'Unexpected ' + json[index] + ' at ' + index;
			value += '"';

			return {
				type: STRING,
				value: value
			};
		};
		take[NUMBER] = function () {
			var value = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:(?:e|E)(?:\+|-)?\d+)?/.exec(json.slice(index));
			if (!value) throw 'Could not match number'
			value = value[0];
			index += value.length;
			return {
				type: NUMBER,
				value: value
			};
		};

		while (index < json.length) {
			tokens.push(take[classify(json[index])]());
			index += /^\s*/.exec(json.slice(index))[0].length;
		}

		return tokens.map(function (token) {
			//token.type = TokenNames[token.type];
			return token;
		});
	};

	var generate = function (tokens) {

		var index = 0;

		var grammar = {};

		function terminal () {
			var terminals = Array.prototype.slice.call(arguments);
			terminals.forEach(function (type) {
				grammar[type] = {
					type: type,
					terminal: true
				};
			});
		}

		function nonterminal (type, options, root) {
			grammar[type] = {
				type: type,
				terminal: false,
				options: options,
				root: root || false
			};
		}

		function terminals () {
			return Object.keys(grammar).filter(function (key) {
				return grammar[key].terminal;
			}).map(function (key) {
				return grammar[key];
			});
		}

		function nonterminals () {
			return Object.keys(grammar).filter(function (key) {
				return !grammar[key].terminal;
			}).map(function (key) {
				return grammar[key];
			});
		}

		function root () {
			var el = Object.keys(grammar).filter(function (key) {
				return grammar[key].root;
			});
			if (!el) throw 'No root element specified for parsing';
			return grammar[el];
		}

		terminal(NULL, TRUE, FALSE, COLON, COMMA);
		terminal(BEGIN_ARRAY, END_ARRAY, BEGIN_OBJECT, END_OBJECT);
		terminal(STRING, NUMBER);

		nonterminal(PROPERTY, [
			[ STRING, COLON, VALUE ]
		]);
		nonterminal(PROPERTIES, [
			[ PROPERTY ],
			[ PROPERTY, PROPERTIES ]
		]);
		nonterminal(OBJECT, [
			[ BEGIN_OBJECT, END_OBJECT ],
			[ BEGIN_OBJECT, PROPERTIES, END_OBJECT ]
		]);

		nonterminal(ELEMENTS, [
			[ VALUE ],
			[ VALUE, COMMA, ELEMENTS ]
		]);
		nonterminal(ARRAY, [
			[ BEGIN_ARRAY, END_ARRAY ],
			[ BEGIN_ARRAY, ELEMENTS, END_ARRAY ]
		]);

		nonterminal(VALUE, [
			NULL, TRUE, FALSE, NUMBER, STRING, ARRAY, OBJECT
		], true);

		function expect (type) {
			if (grammar[type].terminal) {
				if (!tokens[index] === type) {
					throw 'Unexpected token ' + TokenNames[type];
				}
				switch (type) {
					case NULL: return null;
					case TRUE: return true;
					case FALSE: return false;

		return expect(root());
	};

	return {
		tokenize: tokenize,
		parse: function (json) {
			return generate(tokenize(json));
		}
	};

}));
