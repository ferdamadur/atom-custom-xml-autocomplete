var fs, path, trailingWhitespace, attributePattern, tagPattern;

fs = require('fs');
path = require('path');

trailingWhitespace = /\s$/; //
attributePattern = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*$/;
tagPattern = /<([\.\-_a-zA-Z0-9]*)(?:\s|$)/;

module.exports = {
  selector: '.text.xml', // enable for XML
  disableForSelector: '.text.xml .comment', // disable for comments

  // Take priority over other plugins, not necessary
  // inclusionPriority: 1,
  // excludeLowerPriority: true,

  getSuggestions: function(request) {
    if (this.isAttributeValue(request)) {
      return this.getAttributeValueCompletion(request);
    } else if (this.isAttributeNameStartWithNoPrefix(request)) {
      return this.getAllAttributeNameCompletions(request);
    } else if (this.isAttributeNameStartWithPrefix(request)) {
      return this.getAttributeNameCompletions(request);
    } else if (this.isTagNameStartWithNoPrefix(request)) {
      return this.getAllTagNameCompletions(request);
    } else if (this.isTagNameStartWithPrefix(request)) {
      return this.getTagNameCompletions(request);
    } else {
      return [];
    }
  },

  // check if the cursor is on a tag name (prefix is empty)
  isTagNameStartWithNoPrefix: function(arg) {
    var prefix, scopeDescriptor, scopes, editor, bufferPosition, char;

    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    scopes = scopeDescriptor.getScopesArray();
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    char = editor.getTextInBufferRange([[bufferPosition.row, bufferPosition.column - prefix.length - 1], [bufferPosition.row, bufferPosition.column- prefix.length]]);

    return char === '<' && scopes.length === 1 && scopes[0] === 'text.xml';
  },

  // check if the cursor is on a incomplete tag name
  isTagNameStartWithPrefix: function(arg) {
    var prefix, scopeDescriptor, scopes;

    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    scopes = scopeDescriptor.getScopesArray();

    if (!prefix) {
      return false;
    }

    if (trailingWhitespace.test(prefix)) {
      return false;
    }

    return scopes.indexOf('meta.tag.xml') !== -1;
  },

  // check if the cursor is on an attribute name (prefix is empty)
  isAttributeNameStartWithNoPrefix: function(arg) {
    var prefix, scopeDescriptor, scopes;

    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    scopes = scopeDescriptor.getScopesArray();

    if (!trailingWhitespace.test(prefix)) {
      return false;
    }

    return scopes.indexOf('meta.tag.xml') !== -1;
  },

  // check if the cursor is on an incomplete attribute name
  isAttributeNameStartWithPrefix: function(arg) {
    var prefix, scopeDescriptor, scopes, editor, bufferPosition, char;

    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    scopes = arg.scopeDescriptor.getScopesArray();
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    char = editor.getTextInBufferRange([[bufferPosition.row, bufferPosition.column - prefix.length - 1], [bufferPosition.row, bufferPosition.column- prefix.length]]);

    return (scopes.indexOf('meta.tag.xml') !== -1 || scopes.indexOf('meta.tag.no-content.xml') !== -1) && char == ' ';
  },

  // check if the cursor is on an incomplete attribute value
  isAttributeValue: function(arg) {
    var prefix, scopeDescriptor, scopes, lastPrefixCharacter;

    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    scopes = scopeDescriptor.getScopesArray();
    lastPrefixCharacter = prefix[prefix.length-1];

    if (lastPrefixCharacter === '"' || lastPrefixCharacter === "'") {
      return false;
    }

    return (scopes.indexOf('string.quoted.double.xml') !== -1 || scopes.indexOf('string.quoted.single.xml') !== -1) && scopes.indexOf('meta.tag.xml') !== -1;
  },

  // get the tag name completion when prefix is empty
  getAllTagNameCompletions: function() {
    var completions, ref, tag;

    completions = [];
    ref = this.completions.tags;

    for (tag in ref) {
      completions.push({
        text: tag,
        type: 'tag',
        description: tag,
        descriptionMoreURL: "https://www.google.ru/search?q=" + tag,
        replacementPrefix: ''
      })
    }

    return completions;
  },

  // get the tag name completion
  getTagNameCompletions: function(arg) {
    var completions, ref, tag, prefix;

    completions = [];
    ref = this.completions.tags;
    prefix = arg.prefix;

    for (tag in ref) {
      if (tag.indexOf(prefix) === 0) {
        completions.push({
          text: tag,
          type: 'tag',
          description: tag,
          descriptionMoreURL: "https://www.google.ru/search?q=" + tag,
          replacementPrefix: prefix
        })
      }
    }

    return completions;
  },

  // get the atrribute name completion when prefix is empty
  getAllAttributeNameCompletions: function(arg) {
    var completions, ref, attribute, tag, editor, bufferPosition;

    completions = [];
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    tag = this.getPreviousTag(editor, bufferPosition);

    // if there is nothing in json
    if (!this.completions.tags[tag]) {
      return [];
    }

    ref = this.completions.tags[tag].properties;

    for (attribute in ref) {
      // show the default value of the attribute if it exists
      if (ref[attribute].hasOwnProperty('value')) {
        completions.push({
          text: attribute,
          type: 'attribute',
          description: "Default value: " + ref[attribute].value,
          replacementPrefix: ''
        })
      } else {
        completions.push({
          text: attribute,
          type: 'attribute',
          replacementPrefix: ''
        })
      }
    }

    return completions;
  },

  // get the atrribute name completion
  getAttributeNameCompletions: function(arg) {
    var completions, ref, attribute, tag, editor, bufferPosition, prefix, value;

    completions = [];
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    tag = this.getPreviousTag(editor, bufferPosition);

    // if there is nothing in json
    if (!this.completions.tags[tag]) {
      return [];
    }

    ref = this.completions.tags[tag].properties;
    prefix = arg.prefix;

    for (attribute in ref) {
      // show the default value of the attribute if it exists
      if (attribute.indexOf(prefix) === 0 && ref[attribute].hasOwnProperty('value')) {
        completions.push({
          text: attribute,
          type: 'attribute',
          description: "Default value: " + ref[attribute].value,
          replacementPrefix: prefix
        })
      } else if (attribute.indexOf(prefix) === 0) {
        completions.push({
          text: attribute,
          type: 'attribute',
          replacementPrefix: prefix
        })
      }
    }

    return completions;
  },

  // get the atrribute value completion
  getAttributeValueCompletion: function(arg) {
    var prefix, completions, ref, value, tag, attribute, editor, bufferPosition;

    completions = [];
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    tag = this.getPreviousTag(editor, bufferPosition), attribute = this.getPreviousAttribute(editor, bufferPosition);
    prefix = arg.prefix;

    // if there is nothing in json
    if (!this.completions.tags[tag]) {
      return [];
    }
    if (!this.completions.tags[tag].properties[attribute]) {
      return [];
    }

    ref = this.completions.tags[tag].properties[attribute];

    // if value exists
    if (ref.hasOwnProperty('value')) {
      value = ref.value;
      // check the type of the value
      if (ref.type == 'bool') {
        completions.push(...[{
          text: 'true',
          type: 'value',
          replacementPrefix: prefix
        }, {
          text: 'false',
          type: 'value',
          replacementPrefix: prefix
        }]);
      } else if (ref.type == 'string' && value.indexOf(prefix) === 0) {
        completions.push({
          text: value,
          type: 'value',
          replacementPrefix: prefix
        })
      }
    }
    return completions;
  },

  // load the json file
  loadCompletions: function() {
    this.completions = {};
    return fs.readFile(path.resolve(__dirname, '..', 'controls.json'), (function(_this) {
      return function(error, content) {
        if (error == null) {
          _this.completions = JSON.parse(content);
        }
      };
    })(this));
  },

  // get the current tag
  getPreviousTag: function(editor, bufferPosition) {
    var ref, row, tag;

    row = bufferPosition.row;

    while (row >= 0) {
      tag = (ref = tagPattern.exec(editor.lineTextForBufferRow(row))) != null ? ref[1] : void 0;
      if (tag) {
        return tag;
      }
      row--;
    }
  },

  // get the current attribute
  getPreviousAttribute: function(editor, bufferPosition) {
    var line, quoteIndex, ref, ref1;

    line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]).trim();
    quoteIndex = line.length - 1;

    while (line[quoteIndex] && !((ref = line[quoteIndex]) === '"' || ref === "'")) {
      quoteIndex--;
    }

    line = line.substring(0, quoteIndex);

    return (ref1 = attributePattern.exec(line)) != null ? ref1[1] : void 0;
  },
};
