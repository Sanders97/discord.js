'use strict';

const DataStore = require('./DataStore');
const Collection = require('../util/Collection');
const Message = require('../structures/Message');

/**
 * Stores messages for text-based channels.
 * @extends {DataStore}
 */
class MessageStore extends DataStore {
  constructor(channel, iterable) {
    super(channel.client, iterable, Message);
    this.channel = channel;
  }

  add(data, cache) {
    return super.add(data, cache, { extras: [this.channel] });
  }

  set(key, value) {
    const maxSize = this.client.options.messageCacheMaxSize;
    if (maxSize === 0) return;
    if (this.size >= maxSize && maxSize > 0) this.delete(this.firstKey());
    super.set(key, value);
  }

  /**
   * The parameters to pass in when requesting previous messages from a channel. `around`, `before` and
   * `after` are mutually exclusive. All the parameters are optional.
   * @typedef {Object} ChannelLogsQueryOptions
   * @property {number} [limit=50] Number of messages to acquire
   * @property {Snowflake} [before] ID of a message to get the messages that were posted before it
   * @property {Snowflake} [after] ID of a message to get the messages that were posted after it
   * @property {Snowflake} [around] ID of a message to get the messages that were posted around it
   */

  /**
   * Gets a message, or messages, from this channel.
   * <info>The returned Collection does not contain reaction users of the messages if they were not cached.
   * Those need to be fetched separately in such a case.</info>
   * @param {Snowflake|ChannelLogsQueryOptions} [message] The ID of the message to fetch, or query parameters.
   * @param {boolean} [overwrite=false] Whether to overwrite any existing message(s)
   * @returns {Promise<Message>|Promise<Collection<Snowflake, Message>>}
   * @example
   * // Get message
   * channel.messages.fetch('99539446449315840')
   *   .then(message => console.log(message.content))
   *   .catch(console.error);
   * @example
   * // Get messages
   * channel.messages.fetch({ limit: 10 })
   *   .then(messages => console.log(`Received ${messages.size} messages`))
   *   .catch(console.error);
   * @example
   * // Get messages and filter by user ID
   * channel.messages.fetch()
   *   .then(messages => console.log(`${messages.filter(m => m.author.id === '84484653687267328').size} messages`))
   *   .catch(console.error);
   */
  fetch(message, overwrite = false) {
    return typeof message === 'string' ? this._fetchId(message, overwrite) : this._fetchMany(message, overwrite);
  }

  /**
   * Fetches the pinned messages of this channel and returns a collection of them.
   * <info>The returned Collection does not contain any reaction data of the messages.
   * Those need to be fetched separately.</info>
   * @returns {Promise<Collection<Snowflake, Message>>}
   * @example
   * // Get pinned messages
   * channel.fetchPinned()
   *   .then(messages => console.log(`Received ${messages.size} messages`))
   *   .catch(console.error);
   */
  fetchPinned() {
    return this.client.api.channels[this.channel.id].pins.get().then(data => {
      const messages = new Collection();
      for (const message of data) messages.set(message.id, this.add(message));
      return messages;
    });
  }

  async _fetchId(messageID, overwrite) {
    const existing = this.get(messageID);
    const data = await this.client.api.channels[this.channel.id].messages[messageID].get();
    if (existing && overwrite) existing._patch(data);
    return this.add(data);
  }

  async _fetchMany(options = {}) {
    const data = await this.client.api.channels[this.channel.id].messages.get({ query: options });
    const messages = new Collection();
    for (const message of data) messages.set(message.id, this.add(message));
    return messages;
  }


  /**
   * Data that can be resolved to a Message object. This can be:
   * * A Message
   * * A Snowflake
   * @typedef {Message|Snowflake} MessageResolvable
   */

  /**
    * Resolves a MessageResolvable to a Message object.
    * @method resolve
    * @memberof MessageStore
    * @instance
    * @param {MessageResolvable} message The message resolvable to resolve
    * @returns {?Message}
    */

  /**
    * Resolves a MessageResolvable to a Message ID string.
    * @method resolveID
    * @memberof MessageStore
    * @instance
    * @param {MessageResolvable} message The message resolvable to resolve
    * @returns {?Snowflake}
    */
}

module.exports = MessageStore;
