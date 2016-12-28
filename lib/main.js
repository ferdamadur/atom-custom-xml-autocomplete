var provider;

provider = require('./provider');

module.exports = {
  activate: function() {
    return provider.loadCompletions();
  },
  getProvider: function() {
    return provider;
  }
};
