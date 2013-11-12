'use strict'

Terminals = {}
NULL          = Terminals.NULL          = 0x01
TRUE          = Terminals.TRUE          = 0x02
FALSE         = Terminals.FALSE         = 0x03
COLON         = Terminals.COLON         = 0x04
COMMA         = Terminals.COMMA         = 0x05
NUMBER        = Terminals.NUMBER        = 0x06
STRING        = Terminals.STRING        = 0x07
LEFT_BRACE    = Terminals.LEFT_BRACE    = 0x08
RIGHT_BRACE   = Terminals.RIGHT_BRACE   = 0x09
LEFT_BRACKET  = Terminals.LEFT_BRACKET  = 0x0a
RIGHT_BRACKET = Terminals.RIGHT_BRACKET = 0x0b

Nonterminals = {}
VALUE         = Nonterminals.VALUE      = 0x11
OBJECT        = Nonterminals.OBJECT     = 0x12
ARRAY         = Nonterminals.ARRAY      = 0x12
PROPERTIES    = Nonterminals.PROPERTIES = 0x13
PROPERTY      = Nonterminals.PROPERTY   = 0x14

###
parse = (tokenizer) ->
	VALUE = 'null'|'true'|'false'|NUMBER|STRING|OBJECT|ARRAY
	NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:(?:e|E)(?:\+|-)?\d+)?/
	STRING = /^"((?:[^"\\]|\\(?:"\\\/bfnrt)|u[0-9a-fA-F]{4})*)"/
	OBJECT = '{'
###

tokenize = window.tokenize = (json) ->

	###
	class Cursor
		constructor: (@json) ->

		advance: (str) ->
			if str instanceof RegExp
				match = str.exec @json

			@json = @json.slice str.length

		beginsWith: (search) ->
			if search instanceof RegExp


	consume = (str) ->
		throw new SyntaxError unless cursor.beginsWith str
		cursor.advance str

	expect = (type) ->
		consumers = 
			NULL: 'null'
			TRUE 'true'
			FALSE: 'false'
			COLON: ':'
			COMMA: ','
			NUMBER: /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:(?:e|E)(?:\+|-)?\d+)?/
			STRING: /^"((?:[^"\\]|\\(?:"\\\/bfnrt)|u[0-9a-fA-F]{4})*)"/
			LEFT_BRACE: '{'
			RIGHT_BRACE: '}'
			LEFT_BRACKET: '['
			RIGHT_BRACKET: ']'
		if consumers.hasOwnProperty type
			consume consumers[type]
		else throw new 
	###

	class Token
		constructor: (@type, @value) ->

	class Tokenizer
		constructor: ->
			@symbols = {}
			@tokens = []

		# Private

		terminals: ->
			self = this
			Object.keys(@symbols).filter((key) =>
				@symbols[key].terminal
			).map (key) =>
				@symbols[key]

		nonterminals: ->
			self = this
			Object.keys(@symbols).filter((key) =>
				!@symbols[key].terminal
			).map (key) =>
				@symbols[key]

		root: ->
			self = this
			@symbols[Object.keys(@symbols).filter((key) =>
				@symbols[key].root
			)]

		beginsWith = (haystack, needle) ->
			if needle instanceof RegExp then needle.test haystack
			else haystack.substring 0, needle.length == needle

		emit: (token) =>
			@tokens.push token
			token

		expect: (type) ->
			expectation = @symbols[type]
			if expectation.terminal
				value = beginsWith @input, expectation.match
				return false unless value
				@input = @input.slice value.length
				token = new Token type, value
				return emit token
			else # Nonterminal
				for opt in expectation.options
					res = do ->
						for el in opt
							return false unless expect el
						return type
					break if res
				res

		# Public

		terminal: (id, match) ->
			@symbols[id] =
				terminal: true
				root: false
				match: match

		nonterminal: (id, options, root = false) ->
			# TODO: Validate
			@symbols[id] =
				terminal: false
				root: root
				options: options

		tokenize: (input) ->
			@input = input.slice() # copy
			expect @root()
			@tokens

	tokenizer = new Tokenizer

	tokenizer.terminal NULL, 'null'
	tokenizer.terminal TRUE, 'true'
	tokenizer.terminal FALSE, 'false'
	tokenizer.terminal COLON, ':'
	tokenizer.terminal COMMA, ','
	tokenizer.terminal LEFT_BRACE, '{'
	tokenizer.terminal RIGHT_BRACE, '}'
	tokenizer.terminal LEFT_BRACKET, '['
	tokenizer.terminal RIGHT_BRACKET, ']'

	tokenizer.terminal NUMBER, /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:(?:e|E)(?:\+|-)?\d+)?/
	tokenizer.terminal STRING, /^"((?:[^"\\]|\\(?:"\\\/bfnrt)|u[0-9a-fA-F]{4})*)"/

	tokenizer.nonterminal PROPERTY, [
		[ STRING, COLON, VALUE ]
	]

	tokenizer.nonterminal PROPERTIES, [
		[ PROPERTY ],
		[ PROPERTY, PROPERTIES ]
	]

	tokenizer.nonterminal OBJECT, [
		[ LEFT_BRACE, RIGHT_BRACE ],
		[ LEFT_BRACE, PROPERTIES, RIGHT_BRACE ]
	]

	tokenizer.nonterminal VALUE, [
		[ NULL, TRUE, FALSE, NUMBER, STRING, OBJECT, ARRAY ]
	], true

	tokenizer.tokenize json

	###
	classify = -> switch ch
		when 'n' then NULL
		when 't' then TRUE
		when 'f' then FALSE
		when ':' then COLON
		when ',' then COMMA
		when '"' then STRING
		when '{' then LEFT_BRACE
		when '}' then RIGHT_BRACE
		when '[' then LEFT_BRACKET
		when ']' then RIGHT_BRACKET
		when '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' then NUMBER
		else
			throw new SyntaxError "Invalid #{cursor()} at index #{cursor.index()}."
	###
