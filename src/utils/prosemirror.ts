import { marks, schema as baseSchema } from 'ngx-editor/schema';
import { Schema } from 'prosemirror-model';
import { addMentionNodes, addTagNodes, getMentionsPlugin } from 'prosemirror-mentions';
import { Plugin } from 'prosemirror-state';

const schema = new Schema({
    nodes: addTagNodes(addMentionNodes(baseSchema.spec.nodes)),
    marks,
});

/**
 * IMPORTANT: outer div's "suggestion-item-list" class is mandatory. The plugin uses this class for querying.
 * IMPORTANT: inner div's "suggestion-item" class is mandatory too for the same reasons
 */
var getMentionSuggestionsHTML = (items: any[]) =>
    '<div class="suggestion-item-list">' +
    items
        .map((i) => '<div class="suggestion-item">' + i.name + '</div>')
        .join('') +
    '</div>';

/**
 * IMPORTANT: outer div's "suggestion-item-list" class is mandatory. The plugin uses this class for querying.
 * IMPORTANT: inner div's "suggestion-item" class is mandatory too for the same reasons
 */
var getTagSuggestionsHTML = (items: any[]) =>
    '<div class="suggestion-item-list">' +
    items
        .map((i: { tag: string; }) => '<div class="suggestion-item">' + i.tag + '</div>')
        .join('') +
    '</div>';

const users = [
    {
        name: 'John Doe',
        id: '101',
        email: 'joe@gmail.com',
    },
    {
        name: 'Joe Lewis',
        id: '102',
        email: 'lewis@gmail.com',
    },
];

var mentionPlugin = getMentionsPlugin({
    getSuggestions: (type: string, text: string, done: (arg0: { name: string; id: string; email: string; }[] | { tag: string; }[]) => void) => {
        setTimeout(() => {
            if (type === 'mention') {
                // autocomplete : filter list from text and return 5 users
                done(
                    users
                        .filter((x) => x.name.toLowerCase().includes(text.toLowerCase()))
                        .splice(0, 5),
                );
            } else {
                // pass dummy tag suggestions
                done([
                    {
                        tag: 'WikiLeaks',
                    },
                    {
                        tag: 'NetNeutrality',
                    },
                ]);
            }
        }, 0);
    },
    getSuggestionsHTML: (items: any[], type: string) => {
        if (type === 'mention') {
            return getMentionSuggestionsHTML(items);
        } else if (type === 'tag') {
            return getTagSuggestionsHTML(items);
        } else {
            return null;
        }
    },
});


const getPlugins = (): Plugin[] => {
    const plugins = [mentionPlugin];

    return plugins;
};
const plugins = getPlugins();

export {
    plugins,
    schema
};
