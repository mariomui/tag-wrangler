

'use strict';

var obsidian = require('obsidian');

const f = (fn) => [
    /*eslint no-unused-vars: 0*/
    function (a) {return fn(...arguments);},
    function (a, b) {return fn(...arguments);},
    function (a, b, c) {return fn(...arguments);},
    function (a, b, c, d) {return fn(...arguments);},
    function (a, b, c, d, e) {return fn(...arguments);},
];

const currify = (fn, ...args) => {
    check(fn);
    
    if (args.length >= fn.length)
        return fn(...args);
    
    const again = (...args2) => {
        return currify(fn, ...[...args, ...args2]);
    };
    
    const count = fn.length - args.length - 1;
    const func = f(again)[count];
    
    return func || again;
};

var currify_1 = currify;

function check(fn) {
    if (typeof fn !== 'function')
        throw Error('fn should be function!');
}

var fullstore = (value) => {
    const data = {
        value,
    };
    
    return (...args) => {
        const [value] = args;
        
        if (!args.length)
            return data.value;
        
        data.value = value;
        
        return value;
    };
};

const query = (a) => document.querySelector(`[data-name="${a}"]`);

const setAttribute = currify_1((el, obj, name) => el.setAttribute(name, obj[name]));
const set = currify_1((el, obj, name) => el[name] = obj[name]);
const not = currify_1((f, a) => !f(a));
const isCamelCase = (a) => a != a.toLowerCase();

var createElement = (name, options = {}) => {
    const {
        dataName,
        notAppend,
        parent = document.body,
        uniq = true,
        ...restOptions
    } = options;
    
    const elFound = isElementPresent(dataName);
    
    if (uniq && elFound)
        return elFound;
    
    const el = document.createElement(name);
    
    if (dataName)
        el.dataset.name = dataName;
    
    Object.keys(restOptions)
        .filter(isCamelCase)
        .map(set(el, options));
    
    Object.keys(restOptions)
        .filter(not(isCamelCase))
        .map(setAttribute(el, options));
    
    if (!notAppend)
        parent.appendChild(el);
    
    return el;
};

var isElementPresent_1 = isElementPresent;

function isElementPresent(dataName) {
    if (!dataName)
        return;
    
    return query(dataName);
}
createElement.isElementPresent = isElementPresent_1;

const keyDown = currify_1(keyDown_);

const BUTTON_OK_CANCEL = {
    ok: 'OK',
    cancel: 'Cancel',
};

const zIndex = fullstore(100);

var prompt = (title, msg, value = '', options) => {
    const type = getType(options);
    const val = String(value)
        .replace(/"/g, '&quot;');
    
    const valueStr = `<input type="${ type }" value="${ val }" data-name="js-input">`;
    const buttons = getButtons(options) || BUTTON_OK_CANCEL;
    
    return showDialog(title, msg, valueStr, buttons, options);
};

var confirm = (title, msg, options) => {
    const buttons = getButtons(options) || BUTTON_OK_CANCEL;
    
    return showDialog(title, msg, '', buttons, options);
};

var progress = (title, message, options) => {
    const valueStr = `
        <progress value="0" data-name="js-progress" class="progress" max="100"></progress>
        <span data-name="js-counter">0%</span>
    `;
    
    const buttons = {
        cancel: 'Abort',
    };
    
    const promise = showDialog(title, message, valueStr, buttons, options);
    const {ok, dialog} = promise;
    const resolve = ok();
    
    find(dialog, ['cancel']).map((el) => {
        el.focus();
    });
    
    Object.assign(promise, {
        setProgress(count) {
            const [elProgress] = find(dialog, ['progress']);
            const [elCounter] = find(dialog, ['counter']);
            
            elProgress.value = count;
            elCounter.textContent = `${count}%`;
            
            if (count === 100) {
                remove(dialog);
                resolve();
            }
        },
        
        remove() {
            remove(dialog);
        },
    });
    
    return promise;
};

function getButtons(options = {}) {
    const {buttons} = options;
    
    if (!buttons)
        return null;
    
    return buttons;
}

function getType(options = {}) {
    const {type} = options;
    
    if (type === 'password')
        return 'password';
    
    return 'text';
}

function getTemplate(title, msg, value, buttons) {
    const encodedMsg = msg.replace(/\n/g, '<br>');
    
    return `<div class="page">
        <div data-name="js-close" class="close-button"></div>
        <header>${ title }</header>
        <div class="content-area">${ encodedMsg }${ value }</div>
        <div class="action-area">
            <div class="button-strip">
                ${parseButtons(buttons)}
            </div>
        </div>
    </div>`;
}

function parseButtons(buttons) {
    const names = Object.keys(buttons);
    const parse = currify_1((buttons, name, i) => `<button
            tabindex=${i}
            data-name="js-${name.toLowerCase()}">
            ${buttons[name]}
        </button>`);
    
    return names
        .map(parse(buttons))
        .join('');
}

function showDialog(title, msg, value, buttons, options) {
    const ok = fullstore();
    const cancel = fullstore();
    
    const closeButtons = [
        'cancel',
        'close',
        'ok',
    ];
    
    const promise = new Promise((resolve, reject) => {
        const noCancel = options && options.cancel === false;
        const empty = () => {};
        const rejectError = () => reject(Error());
        
        ok(resolve);
        cancel(noCancel ? empty : rejectError);
    });
    
    const innerHTML = getTemplate(title, msg, value, buttons);
    
    const dialog = createElement('div', {
        innerHTML,
        className: 'smalltalk',
        style: `z-index: ${zIndex(zIndex() + 1)}`,
    });
    
    for (const el of find(dialog, ['ok', 'input']))
        el.focus();
    
    for (const el of find(dialog, ['input'])) {
        el.setSelectionRange(0, value.length);
    }
    
    addListenerAll('click', dialog, closeButtons, (event) => {
        closeDialog(event.target, dialog, ok(), cancel());
    });
    
    for (const event of ['click', 'contextmenu'])
        dialog.addEventListener(event, (e) => {
            e.stopPropagation();
            for (const el of find(dialog, ['ok', 'input']))
                el.focus();
        });
    
    dialog.addEventListener('keydown', keyDown(dialog, ok(), cancel()));
    
    return Object.assign(promise, {
        dialog,
        ok,
    });
}

function keyDown_(dialog, ok, cancel, event) {
    const KEY = {
        ENTER : 13,
        ESC   : 27,
        TAB   : 9,
        LEFT  : 37,
        UP    : 38,
        RIGHT : 39,
        DOWN  : 40,
    };
    
    const {keyCode} = event;
    const el = event.target;
    
    const namesAll = ['ok', 'cancel', 'input'];
    const names = find(dialog, namesAll)
        .map(getDataName);
    
    switch(keyCode) {
    case KEY.ENTER:
        closeDialog(el, dialog, ok, cancel);
        event.preventDefault();
        break;
    
    case KEY.ESC:
        remove(dialog);
        cancel();
        break;
    
    case KEY.TAB:
        if (event.shiftKey)
            tab(dialog, names);
        
        tab(dialog, names);
        event.preventDefault();
        break;
    
    default:
        ['left', 'right', 'up', 'down'].filter((name) => {
            return keyCode === KEY[name.toUpperCase()];
        }).forEach(() => {
            changeButtonFocus(dialog, names);
        });
        
        break;
    }
    
    event.stopPropagation();
}

function getDataName(el) {
    return el
        .getAttribute('data-name')
        .replace('js-', '');
}

const getName = (activeName) => {
    if (activeName === 'cancel')
        return 'ok';
    
    return 'cancel';
};

function changeButtonFocus(dialog, names) {
    const active = document.activeElement;
    const activeName = getDataName(active);
    const isButton = /ok|cancel/.test(activeName);
    const count = names.length - 1;
    
    if (activeName === 'input' || !count || !isButton)
        return;
    
    const name = getName(activeName);
    
    for (const el of find(dialog, [name])) {
        el.focus();
    }
}

const getIndex = (count, index) => {
    if (index === count)
        return 0;
    
    return index + 1;
};

function tab(dialog, names) {
    const active = document.activeElement;
    const activeName = getDataName(active);
    const count = names.length - 1;
    
    const activeIndex = names.indexOf(activeName);
    const index = getIndex(count, activeIndex);
    
    const name = names[index];
    
    for (const el of find(dialog, [name]))
        el.focus();
}

function closeDialog(el, dialog, ok, cancel) {
    const name = el
        .getAttribute('data-name')
        .replace('js-', '');
    
    if (/close|cancel/.test(name)) {
        cancel();
        remove(dialog);
        return;
    }
    
    const value = find(dialog, ['input'])
        .reduce((value, el) => el.value, null);
    
    ok(value);
    remove(dialog);
}

const query$1 = currify_1((element, name) => element.querySelector(`[data-name="js-${ name }"]`));

function find(element, names) {
    const elements = names
        .map(query$1(element))
        .filter(Boolean);
    
    return elements;
}

function addListenerAll(event, parent, elements, fn) {
    for (const el of find(parent, elements)) {
        el.addEventListener(event, fn);
    }
}

function remove(dialog) {
    const {parentElement} = dialog;
    
    if (parentElement)
        parentElement.removeChild(dialog);
}

class Progress {

    constructor(title, message) {
        this.progress = progress(title, message);
        this.progress.catch(() => this.aborted = true);
        this.dialog = this.progress.dialog;
        this.aborted = false;
    }

    async forEach(collection, func) {
        try {
            if (this.aborted)
                return;
            let processed = 0, range = collection.length, accum = 0, pct = 0;
            for (const item of collection) {
                await func(item, processed++, collection, this);
                if (this.aborted)
                    return;
                accum += 100;
                if (accum > range) {
                    const remainder = accum % range, step = (accum - remainder) / range;
                    this.progress.setProgress(pct += step);
                    accum = remainder;
                }
            }
            if (pct < 100)
                this.progress.setProgress(100);
            return this;
        } finally {
            this.progress.remove();
        }
    }

    set title(text) { this.dialog.querySelector("header").textContent = text; }
    get title() { return this.dialog.querySelector("header").textContent; }

    set message(text) {
        this.dialog.querySelector(".content-area").childNodes[0].textContent = text;
    }

    get message() {
        return this.dialog.querySelector(".content-area").childNodes[0].textContent;
    }
}

async function validatedInput(title, message, value = "", regex = ".*", what = "entry") {
    while (true) {
        const input = prompt(title, message, value);
        const inputField = input.dialog.find("input");
        const isValid = (t) => new RegExp(`^${regex}$`).test(t);

        inputField.setSelectionRange(value.length, value.length);
        inputField.pattern = regex;
        inputField.oninput = () => inputField.setAttribute("aria-invalid", !isValid(inputField.value));

        const result = await input;
        if (isValid(result)) return result;

        new obsidian.Notice(`"${result}" is not a valid ${what}`);
    }
}

async function renameTag(app, tagName) {
    var newName;
    try {
        newName = await validatedInput(
            `Renaming #${tagName} (and any sub-tags)`, "Enter new name (must be a valid Obsidian tag):\n", tagName,
            "[^\u2000-\u206F\u2E00-\u2E7F'!\"#$%&()*+,.:;<=>?@^`{|}~\\[\\]\\\\\\s]+",
            "Obsidian tag name"
        );
    }
    catch(e) {
        return;
    }
    if (!newName || newName === tagName) {
        return new obsidian.Notice("Unchanged or empty tag: No changes made.");
    }

    const clash = tagClashes(app, "#"+tagName, "#"+newName);
    if (clash) {
        try { await confirm(
            "WARNING: No Undo!",
            `Renaming #${tagName} to #${newName} will merge some tags
into existing tags (such as ${clash}).

This <b>cannot</b> be undone.  Do you wish to proceed?`); }
        catch(e) { return; }
    }

    const filesToRename = await tagPositions(app, "#"+tagName);
    if (!filesToRename) return;

    const progress = new Progress(`Renaming to ${newName}/*`, "Processing files...");
    let updated = 0;
    await progress.forEach(filesToRename, async (f) => {
        progress.message = "Processing " + f.filename.split("/").pop();
        const file = app.vault.getAbstractFileByPath(f.filename);
        const original = await app.vault.read(file);
        if (progress.aborted) return;
        let text = original;
        for(const { position: {start, end}, tag} of f) {
            if (text.slice(start.offset, end.offset) !== tag) {
                new obsidian.Notice(`File ${f.filename} has changed; skipping`);
                console.error(`File ${f.filename} has changed; skipping`);
                console.debug(text.slice(start.offset, end.offset), tag);
                return;
            }
            text = text.slice(0, start.offset) + "#"+newName + text.slice(start.offset + tagName.length + 1);
        }
        if (text !== original) { await app.vault.modify(file, text); updated++; }
    });
    return new obsidian.Notice(`Operation ${progress.aborted ? "cancelled" : "complete"}: ${updated} file(s) updated`);
}

function tagClashes(app, oldTag, newTag) {
    const prefix = oldTag + "/";
    const tags = new Set(Object.keys(app.metadataCache.getTags()));
    for (const tag of tags) {
        if (tag === oldTag || tag.startsWith(prefix)) {
            const changed = newTag + tag.slice(oldTag.length);
            if (tags.has(changed))
                return changed;
        }
    }
}

async function tagPositions(app, tagName) {
    const prefix = tagName + "/", result = [];
    function tagMatches(tag) {
        return tag == tagName || tag.startsWith(prefix);
    }

    const progress = new Progress(`Searching for ${prefix}*`, "Matching files...");
    await progress.forEach(
        app.metadataCache.getCachedFiles(),
        n => {
            let { frontmatter, tags } = app.metadataCache.getCache(n);
            tags = tags && tags.filter(t => tagMatches(t.tag || "")).reverse() || []; // last positions first
            tags.filename = n;
            tags.fmtags = obsidian.parseFrontMatterTags(frontmatter).filter(tagMatches);
            tags.frontmatter = frontmatter;
            if (tags.length || tags.fmtags.length)
                result.push(tags);
        }
    );
    if (!progress.aborted)
        return result;
}

function onElement(el, event, selector, callback, options) {
    el.on(event, selector, callback, options);
    return () => el.off(event, selector, callback, options);
}

class TagWrangler extends obsidian.Plugin {
    onload(){
        this.register(
            onElement(document, "contextmenu", ".tag-pane-tag", this.onMenu.bind(this), {capture: true})
        );
        this.register(
            onElement(document, "mousedown", ".tag-pane-tag", () => {window.lastFocus = document.activeElement;}, {capture: true})
        );
    }

    onMenu(e, tagEl) {
        const
            tagName = tagEl.find(".tag-pane-tag-text").textContent,
            treeParent = tagEl.parentElement.parentElement,
            isHierarchy = treeParent.find(".collapse-icon"),
            searchPlugin = this.app.internalPlugins.getPluginById("global-search"),
            search = searchPlugin && searchPlugin.instance,
            query = search && search.getGlobalSearchQuery(),
            menu = new TagMenu().addItem(item("pencil", "Rename #"+tagName, () => this.rename(tagName)));

        if (search) {
            menu.addSeparator().addItem(
                item("magnifying-glass", "New search for #"+tagName, () => search.openGlobalSearch("tag:" + tagName))
            );
            if (query) {
                menu.addItem(
                    item("sheets-in-box", "Require #"+tagName+" in search"  , () => search.openGlobalSearch(query+" tag:"  + tagName))
                );
            }
            menu.addItem(
                item("crossed-star" , "Exclude #"+tagName+" from search", () => search.openGlobalSearch(query+" -tag:" + tagName))
            );
        }

        if (isHierarchy) {
            function toggle(collapse) {
                for(const el of treeParent.children) {
                    if (!el.hasClass("tree-item")) continue;
                    if (collapse !== el.hasClass("is-collapsed")) {
                        const button = el.find(".collapse-icon");
                        if (button) button.click();
                    }
                }
            }
            menu.addSeparator()
            .addItem(item("vertical-three-dots", "Collapse tags at this level", () => toggle(true )))
            .addItem(item("expand-vertically"  , "Expand tags at this level"  , () => toggle(false)));
        }

        menu.showAtPosition({x: e.pageX, y: e.pageY});
    }

    async rename(tagName) {
        try { await renameTag(this.app, tagName); }
        catch (e) { console.error(e); new obsidian.Notice("error: " + e); }
    }

}

class TagMenu extends obsidian.Menu {
    load() {
        super.load();
        this.register(
            onElement(document, "keydown", "*", this.onKeydown.bind(this), {capture: true})
        );
    }
    onKeydown(e) {
        if (e.key=="Escape") {
            e.preventDefault();
            this.hide();
        }
    }
}

function item(icon, title, click) {
    return i => i.setIcon(icon).setTitle(title).onClick(click);
}

module.exports = TagWrangler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLnlhcm4vY2FjaGUvY3VycmlmeS1ucG0tNC4wLjAtYjkyZWUzYTRlYi04MjViNjgxODQxLnppcC9ub2RlX21vZHVsZXMvY3VycmlmeS9saWIvY3VycmlmeS5qcyIsIi55YXJuL2NhY2hlL2Z1bGxzdG9yZS1ucG0tMy4wLjAtYzQ4NTY0NGE2NS02ZDM5OTNjN2JmLnppcC9ub2RlX21vZHVsZXMvZnVsbHN0b3JlL2xpYi9mdWxsc3RvcmUuanMiLCIueWFybi9jYWNoZS9AY2xvdWRjbWQtY3JlYXRlLWVsZW1lbnQtbnBtLTIuMC4yLTE5NzY5NTlhNmMtMTk2ZDA5YjJkMi56aXAvbm9kZV9tb2R1bGVzL0BjbG91ZGNtZC9jcmVhdGUtZWxlbWVudC9saWIvY3JlYXRlLWVsZW1lbnQuanMiLCIueWFybi9jYWNoZS9zbWFsbHRhbGstbnBtLTQuMC43LTgyMzM5ZjY2NzItZDY3MzZmMzI0Yy56aXAvbm9kZV9tb2R1bGVzL3NtYWxsdGFsay9saWIvc21hbGx0YWxrLmpzIiwic3JjL3Byb2dyZXNzLmpzIiwic3JjL3ZhbGlkYXRpb24uanMiLCJzcmMvcmVuYW1pbmcuanMiLCJzcmMvcGx1Z2luLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuY29uc3QgZiA9IChmbikgPT4gW1xuICAgIC8qZXNsaW50IG5vLXVudXNlZC12YXJzOiAwKi9cbiAgICBmdW5jdGlvbiAoYSkge3JldHVybiBmbiguLi5hcmd1bWVudHMpO30sXG4gICAgZnVuY3Rpb24gKGEsIGIpIHtyZXR1cm4gZm4oLi4uYXJndW1lbnRzKTt9LFxuICAgIGZ1bmN0aW9uIChhLCBiLCBjKSB7cmV0dXJuIGZuKC4uLmFyZ3VtZW50cyk7fSxcbiAgICBmdW5jdGlvbiAoYSwgYiwgYywgZCkge3JldHVybiBmbiguLi5hcmd1bWVudHMpO30sXG4gICAgZnVuY3Rpb24gKGEsIGIsIGMsIGQsIGUpIHtyZXR1cm4gZm4oLi4uYXJndW1lbnRzKTt9LFxuXTtcblxuY29uc3QgY3VycmlmeSA9IChmbiwgLi4uYXJncykgPT4ge1xuICAgIGNoZWNrKGZuKTtcbiAgICBcbiAgICBpZiAoYXJncy5sZW5ndGggPj0gZm4ubGVuZ3RoKVxuICAgICAgICByZXR1cm4gZm4oLi4uYXJncyk7XG4gICAgXG4gICAgY29uc3QgYWdhaW4gPSAoLi4uYXJnczIpID0+IHtcbiAgICAgICAgcmV0dXJuIGN1cnJpZnkoZm4sIC4uLlsuLi5hcmdzLCAuLi5hcmdzMl0pO1xuICAgIH07XG4gICAgXG4gICAgY29uc3QgY291bnQgPSBmbi5sZW5ndGggLSBhcmdzLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgZnVuYyA9IGYoYWdhaW4pW2NvdW50XTtcbiAgICBcbiAgICByZXR1cm4gZnVuYyB8fCBhZ2Fpbjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY3VycmlmeTtcblxuZnVuY3Rpb24gY2hlY2soZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBFcnJvcignZm4gc2hvdWxkIGJlIGZ1bmN0aW9uIScpO1xufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gKHZhbHVlKSA9PiB7XG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgdmFsdWUsXG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgY29uc3QgW3ZhbHVlXSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIGRhdGEudmFsdWU7XG4gICAgICAgIFxuICAgICAgICBkYXRhLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgY3VycmlmeSA9IHJlcXVpcmUoJ2N1cnJpZnknKTtcbmNvbnN0IHF1ZXJ5ID0gKGEpID0+IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke2F9XCJdYCk7XG5cbmNvbnN0IHNldEF0dHJpYnV0ZSA9IGN1cnJpZnkoKGVsLCBvYmosIG5hbWUpID0+IGVsLnNldEF0dHJpYnV0ZShuYW1lLCBvYmpbbmFtZV0pKTtcbmNvbnN0IHNldCA9IGN1cnJpZnkoKGVsLCBvYmosIG5hbWUpID0+IGVsW25hbWVdID0gb2JqW25hbWVdKTtcbmNvbnN0IG5vdCA9IGN1cnJpZnkoKGYsIGEpID0+ICFmKGEpKTtcbmNvbnN0IGlzQ2FtZWxDYXNlID0gKGEpID0+IGEgIT0gYS50b0xvd2VyQ2FzZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChuYW1lLCBvcHRpb25zID0ge30pID0+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGRhdGFOYW1lLFxuICAgICAgICBub3RBcHBlbmQsXG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50LmJvZHksXG4gICAgICAgIHVuaXEgPSB0cnVlLFxuICAgICAgICAuLi5yZXN0T3B0aW9uc1xuICAgIH0gPSBvcHRpb25zO1xuICAgIFxuICAgIGNvbnN0IGVsRm91bmQgPSBpc0VsZW1lbnRQcmVzZW50KGRhdGFOYW1lKTtcbiAgICBcbiAgICBpZiAodW5pcSAmJiBlbEZvdW5kKVxuICAgICAgICByZXR1cm4gZWxGb3VuZDtcbiAgICBcbiAgICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobmFtZSk7XG4gICAgXG4gICAgaWYgKGRhdGFOYW1lKVxuICAgICAgICBlbC5kYXRhc2V0Lm5hbWUgPSBkYXRhTmFtZTtcbiAgICBcbiAgICBPYmplY3Qua2V5cyhyZXN0T3B0aW9ucylcbiAgICAgICAgLmZpbHRlcihpc0NhbWVsQ2FzZSlcbiAgICAgICAgLm1hcChzZXQoZWwsIG9wdGlvbnMpKTtcbiAgICBcbiAgICBPYmplY3Qua2V5cyhyZXN0T3B0aW9ucylcbiAgICAgICAgLmZpbHRlcihub3QoaXNDYW1lbENhc2UpKVxuICAgICAgICAubWFwKHNldEF0dHJpYnV0ZShlbCwgb3B0aW9ucykpO1xuICAgIFxuICAgIGlmICghbm90QXBwZW5kKVxuICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIFxuICAgIHJldHVybiBlbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzRWxlbWVudFByZXNlbnQgPSBpc0VsZW1lbnRQcmVzZW50O1xuXG5mdW5jdGlvbiBpc0VsZW1lbnRQcmVzZW50KGRhdGFOYW1lKSB7XG4gICAgaWYgKCFkYXRhTmFtZSlcbiAgICAgICAgcmV0dXJuO1xuICAgIFxuICAgIHJldHVybiBxdWVyeShkYXRhTmFtZSk7XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnLi4vY3NzL3NtYWxsdGFsay5jc3MnKTtcblxuY29uc3QgY3VycmlmeSA9IHJlcXVpcmUoJ2N1cnJpZnknKTtcbmNvbnN0IHN0b3JlID0gcmVxdWlyZSgnZnVsbHN0b3JlJyk7XG5jb25zdCBjcmVhdGVFbGVtZW50ID0gcmVxdWlyZSgnQGNsb3VkY21kL2NyZWF0ZS1lbGVtZW50Jyk7XG5cbmNvbnN0IGtleURvd24gPSBjdXJyaWZ5KGtleURvd25fKTtcblxuY29uc3QgQlVUVE9OX09LID0ge1xuICAgIG9rOiAnT0snLFxufTtcblxuY29uc3QgQlVUVE9OX09LX0NBTkNFTCA9IHtcbiAgICBvazogJ09LJyxcbiAgICBjYW5jZWw6ICdDYW5jZWwnLFxufTtcblxuY29uc3QgekluZGV4ID0gc3RvcmUoMTAwKTtcblxuZXhwb3J0cy5hbGVydCA9ICh0aXRsZSwgbXNnLCBvcHRpb25zKSA9PiB7XG4gICAgY29uc3QgYnV0dG9ucyA9IGdldEJ1dHRvbnMob3B0aW9ucykgfHwgQlVUVE9OX09LO1xuICAgIHJldHVybiBzaG93RGlhbG9nKHRpdGxlLCBtc2csICcnLCBidXR0b25zLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydHMucHJvbXB0ID0gKHRpdGxlLCBtc2csIHZhbHVlID0gJycsIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0eXBlID0gZ2V0VHlwZShvcHRpb25zKTtcbiAgICBjb25zdCB2YWwgPSBTdHJpbmcodmFsdWUpXG4gICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgXG4gICAgY29uc3QgdmFsdWVTdHIgPSBgPGlucHV0IHR5cGU9XCIkeyB0eXBlIH1cIiB2YWx1ZT1cIiR7IHZhbCB9XCIgZGF0YS1uYW1lPVwianMtaW5wdXRcIj5gO1xuICAgIGNvbnN0IGJ1dHRvbnMgPSBnZXRCdXR0b25zKG9wdGlvbnMpIHx8IEJVVFRPTl9PS19DQU5DRUw7XG4gICAgXG4gICAgcmV0dXJuIHNob3dEaWFsb2codGl0bGUsIG1zZywgdmFsdWVTdHIsIGJ1dHRvbnMsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0cy5jb25maXJtID0gKHRpdGxlLCBtc2csIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCBidXR0b25zID0gZ2V0QnV0dG9ucyhvcHRpb25zKSB8fCBCVVRUT05fT0tfQ0FOQ0VMO1xuICAgIFxuICAgIHJldHVybiBzaG93RGlhbG9nKHRpdGxlLCBtc2csICcnLCBidXR0b25zLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydHMucHJvZ3Jlc3MgPSAodGl0bGUsIG1lc3NhZ2UsIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB2YWx1ZVN0ciA9IGBcbiAgICAgICAgPHByb2dyZXNzIHZhbHVlPVwiMFwiIGRhdGEtbmFtZT1cImpzLXByb2dyZXNzXCIgY2xhc3M9XCJwcm9ncmVzc1wiIG1heD1cIjEwMFwiPjwvcHJvZ3Jlc3M+XG4gICAgICAgIDxzcGFuIGRhdGEtbmFtZT1cImpzLWNvdW50ZXJcIj4wJTwvc3Bhbj5cbiAgICBgO1xuICAgIFxuICAgIGNvbnN0IGJ1dHRvbnMgPSB7XG4gICAgICAgIGNhbmNlbDogJ0Fib3J0JyxcbiAgICB9O1xuICAgIFxuICAgIGNvbnN0IHByb21pc2UgPSBzaG93RGlhbG9nKHRpdGxlLCBtZXNzYWdlLCB2YWx1ZVN0ciwgYnV0dG9ucywgb3B0aW9ucyk7XG4gICAgY29uc3Qge29rLCBkaWFsb2d9ID0gcHJvbWlzZTtcbiAgICBjb25zdCByZXNvbHZlID0gb2soKTtcbiAgICBcbiAgICBmaW5kKGRpYWxvZywgWydjYW5jZWwnXSkubWFwKChlbCkgPT4ge1xuICAgICAgICBlbC5mb2N1cygpO1xuICAgIH0pO1xuICAgIFxuICAgIE9iamVjdC5hc3NpZ24ocHJvbWlzZSwge1xuICAgICAgICBzZXRQcm9ncmVzcyhjb3VudCkge1xuICAgICAgICAgICAgY29uc3QgW2VsUHJvZ3Jlc3NdID0gZmluZChkaWFsb2csIFsncHJvZ3Jlc3MnXSk7XG4gICAgICAgICAgICBjb25zdCBbZWxDb3VudGVyXSA9IGZpbmQoZGlhbG9nLCBbJ2NvdW50ZXInXSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsUHJvZ3Jlc3MudmFsdWUgPSBjb3VudDtcbiAgICAgICAgICAgIGVsQ291bnRlci50ZXh0Q29udGVudCA9IGAke2NvdW50fSVgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY291bnQgPT09IDEwMCkge1xuICAgICAgICAgICAgICAgIHJlbW92ZShkaWFsb2cpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIHJlbW92ZSgpIHtcbiAgICAgICAgICAgIHJlbW92ZShkaWFsb2cpO1xuICAgICAgICB9LFxuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxuZnVuY3Rpb24gZ2V0QnV0dG9ucyhvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB7YnV0dG9uc30gPSBvcHRpb25zO1xuICAgIFxuICAgIGlmICghYnV0dG9ucylcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgcmV0dXJuIGJ1dHRvbnM7XG59XG5cbmZ1bmN0aW9uIGdldFR5cGUob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qge3R5cGV9ID0gb3B0aW9ucztcbiAgICBcbiAgICBpZiAodHlwZSA9PT0gJ3Bhc3N3b3JkJylcbiAgICAgICAgcmV0dXJuICdwYXNzd29yZCc7XG4gICAgXG4gICAgcmV0dXJuICd0ZXh0Jztcbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGUodGl0bGUsIG1zZywgdmFsdWUsIGJ1dHRvbnMpIHtcbiAgICBjb25zdCBlbmNvZGVkTXNnID0gbXNnLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgIFxuICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInBhZ2VcIj5cbiAgICAgICAgPGRpdiBkYXRhLW5hbWU9XCJqcy1jbG9zZVwiIGNsYXNzPVwiY2xvc2UtYnV0dG9uXCI+PC9kaXY+XG4gICAgICAgIDxoZWFkZXI+JHsgdGl0bGUgfTwvaGVhZGVyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudC1hcmVhXCI+JHsgZW5jb2RlZE1zZyB9JHsgdmFsdWUgfTwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYWN0aW9uLWFyZWFcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJidXR0b24tc3RyaXBcIj5cbiAgICAgICAgICAgICAgICAke3BhcnNlQnV0dG9ucyhidXR0b25zKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5gO1xufVxuXG5mdW5jdGlvbiBwYXJzZUJ1dHRvbnMoYnV0dG9ucykge1xuICAgIGNvbnN0IG5hbWVzID0gT2JqZWN0LmtleXMoYnV0dG9ucyk7XG4gICAgY29uc3QgcGFyc2UgPSBjdXJyaWZ5KChidXR0b25zLCBuYW1lLCBpKSA9PiBgPGJ1dHRvblxuICAgICAgICAgICAgdGFiaW5kZXg9JHtpfVxuICAgICAgICAgICAgZGF0YS1uYW1lPVwianMtJHtuYW1lLnRvTG93ZXJDYXNlKCl9XCI+XG4gICAgICAgICAgICAke2J1dHRvbnNbbmFtZV19XG4gICAgICAgIDwvYnV0dG9uPmApO1xuICAgIFxuICAgIHJldHVybiBuYW1lc1xuICAgICAgICAubWFwKHBhcnNlKGJ1dHRvbnMpKVxuICAgICAgICAuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIHNob3dEaWFsb2codGl0bGUsIG1zZywgdmFsdWUsIGJ1dHRvbnMsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBvayA9IHN0b3JlKCk7XG4gICAgY29uc3QgY2FuY2VsID0gc3RvcmUoKTtcbiAgICBcbiAgICBjb25zdCBjbG9zZUJ1dHRvbnMgPSBbXG4gICAgICAgICdjYW5jZWwnLFxuICAgICAgICAnY2xvc2UnLFxuICAgICAgICAnb2snLFxuICAgIF07XG4gICAgXG4gICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3Qgbm9DYW5jZWwgPSBvcHRpb25zICYmIG9wdGlvbnMuY2FuY2VsID09PSBmYWxzZTtcbiAgICAgICAgY29uc3QgZW1wdHkgPSAoKSA9PiB7fTtcbiAgICAgICAgY29uc3QgcmVqZWN0RXJyb3IgPSAoKSA9PiByZWplY3QoRXJyb3IoKSk7XG4gICAgICAgIFxuICAgICAgICBvayhyZXNvbHZlKTtcbiAgICAgICAgY2FuY2VsKG5vQ2FuY2VsID8gZW1wdHkgOiByZWplY3RFcnJvcik7XG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgaW5uZXJIVE1MID0gZ2V0VGVtcGxhdGUodGl0bGUsIG1zZywgdmFsdWUsIGJ1dHRvbnMpO1xuICAgIFxuICAgIGNvbnN0IGRpYWxvZyA9IGNyZWF0ZUVsZW1lbnQoJ2RpdicsIHtcbiAgICAgICAgaW5uZXJIVE1MLFxuICAgICAgICBjbGFzc05hbWU6ICdzbWFsbHRhbGsnLFxuICAgICAgICBzdHlsZTogYHotaW5kZXg6ICR7ekluZGV4KHpJbmRleCgpICsgMSl9YCxcbiAgICB9KTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IGVsIG9mIGZpbmQoZGlhbG9nLCBbJ29rJywgJ2lucHV0J10pKVxuICAgICAgICBlbC5mb2N1cygpO1xuICAgIFxuICAgIGZvciAoY29uc3QgZWwgb2YgZmluZChkaWFsb2csIFsnaW5wdXQnXSkpIHtcbiAgICAgICAgZWwuc2V0U2VsZWN0aW9uUmFuZ2UoMCwgdmFsdWUubGVuZ3RoKTtcbiAgICB9XG4gICAgXG4gICAgYWRkTGlzdGVuZXJBbGwoJ2NsaWNrJywgZGlhbG9nLCBjbG9zZUJ1dHRvbnMsIChldmVudCkgPT4ge1xuICAgICAgICBjbG9zZURpYWxvZyhldmVudC50YXJnZXQsIGRpYWxvZywgb2soKSwgY2FuY2VsKCkpO1xuICAgIH0pO1xuICAgIFxuICAgIGZvciAoY29uc3QgZXZlbnQgb2YgWydjbGljaycsICdjb250ZXh0bWVudSddKVxuICAgICAgICBkaWFsb2cuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKGUpID0+IHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGZpbmQoZGlhbG9nLCBbJ29rJywgJ2lucHV0J10pKVxuICAgICAgICAgICAgICAgIGVsLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgIFxuICAgIGRpYWxvZy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5RG93bihkaWFsb2csIG9rKCksIGNhbmNlbCgpKSk7XG4gICAgXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocHJvbWlzZSwge1xuICAgICAgICBkaWFsb2csXG4gICAgICAgIG9rLFxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBrZXlEb3duXyhkaWFsb2csIG9rLCBjYW5jZWwsIGV2ZW50KSB7XG4gICAgY29uc3QgS0VZID0ge1xuICAgICAgICBFTlRFUiA6IDEzLFxuICAgICAgICBFU0MgICA6IDI3LFxuICAgICAgICBUQUIgICA6IDksXG4gICAgICAgIExFRlQgIDogMzcsXG4gICAgICAgIFVQICAgIDogMzgsXG4gICAgICAgIFJJR0hUIDogMzksXG4gICAgICAgIERPV04gIDogNDAsXG4gICAgfTtcbiAgICBcbiAgICBjb25zdCB7a2V5Q29kZX0gPSBldmVudDtcbiAgICBjb25zdCBlbCA9IGV2ZW50LnRhcmdldDtcbiAgICBcbiAgICBjb25zdCBuYW1lc0FsbCA9IFsnb2snLCAnY2FuY2VsJywgJ2lucHV0J107XG4gICAgY29uc3QgbmFtZXMgPSBmaW5kKGRpYWxvZywgbmFtZXNBbGwpXG4gICAgICAgIC5tYXAoZ2V0RGF0YU5hbWUpO1xuICAgIFxuICAgIHN3aXRjaChrZXlDb2RlKSB7XG4gICAgY2FzZSBLRVkuRU5URVI6XG4gICAgICAgIGNsb3NlRGlhbG9nKGVsLCBkaWFsb2csIG9rLCBjYW5jZWwpO1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBicmVhaztcbiAgICBcbiAgICBjYXNlIEtFWS5FU0M6XG4gICAgICAgIHJlbW92ZShkaWFsb2cpO1xuICAgICAgICBjYW5jZWwoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgXG4gICAgY2FzZSBLRVkuVEFCOlxuICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpXG4gICAgICAgICAgICB0YWIoZGlhbG9nLCBuYW1lcyk7XG4gICAgICAgIFxuICAgICAgICB0YWIoZGlhbG9nLCBuYW1lcyk7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgIFxuICAgIGRlZmF1bHQ6XG4gICAgICAgIFsnbGVmdCcsICdyaWdodCcsICd1cCcsICdkb3duJ10uZmlsdGVyKChuYW1lKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4ga2V5Q29kZSA9PT0gS0VZW25hbWUudG9VcHBlckNhc2UoKV07XG4gICAgICAgIH0pLmZvckVhY2goKCkgPT4ge1xuICAgICAgICAgICAgY2hhbmdlQnV0dG9uRm9jdXMoZGlhbG9nLCBuYW1lcyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIFxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xufVxuXG5mdW5jdGlvbiBnZXREYXRhTmFtZShlbCkge1xuICAgIHJldHVybiBlbFxuICAgICAgICAuZ2V0QXR0cmlidXRlKCdkYXRhLW5hbWUnKVxuICAgICAgICAucmVwbGFjZSgnanMtJywgJycpO1xufVxuXG5jb25zdCBnZXROYW1lID0gKGFjdGl2ZU5hbWUpID0+IHtcbiAgICBpZiAoYWN0aXZlTmFtZSA9PT0gJ2NhbmNlbCcpXG4gICAgICAgIHJldHVybiAnb2snO1xuICAgIFxuICAgIHJldHVybiAnY2FuY2VsJztcbn07XG5cbmZ1bmN0aW9uIGNoYW5nZUJ1dHRvbkZvY3VzKGRpYWxvZywgbmFtZXMpIHtcbiAgICBjb25zdCBhY3RpdmUgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICAgIGNvbnN0IGFjdGl2ZU5hbWUgPSBnZXREYXRhTmFtZShhY3RpdmUpO1xuICAgIGNvbnN0IGlzQnV0dG9uID0gL29rfGNhbmNlbC8udGVzdChhY3RpdmVOYW1lKTtcbiAgICBjb25zdCBjb3VudCA9IG5hbWVzLmxlbmd0aCAtIDE7XG4gICAgXG4gICAgaWYgKGFjdGl2ZU5hbWUgPT09ICdpbnB1dCcgfHwgIWNvdW50IHx8ICFpc0J1dHRvbilcbiAgICAgICAgcmV0dXJuO1xuICAgIFxuICAgIGNvbnN0IG5hbWUgPSBnZXROYW1lKGFjdGl2ZU5hbWUpO1xuICAgIFxuICAgIGZvciAoY29uc3QgZWwgb2YgZmluZChkaWFsb2csIFtuYW1lXSkpIHtcbiAgICAgICAgZWwuZm9jdXMoKTtcbiAgICB9XG59XG5cbmNvbnN0IGdldEluZGV4ID0gKGNvdW50LCBpbmRleCkgPT4ge1xuICAgIGlmIChpbmRleCA9PT0gY291bnQpXG4gICAgICAgIHJldHVybiAwO1xuICAgIFxuICAgIHJldHVybiBpbmRleCArIDE7XG59O1xuXG5mdW5jdGlvbiB0YWIoZGlhbG9nLCBuYW1lcykge1xuICAgIGNvbnN0IGFjdGl2ZSA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG4gICAgY29uc3QgYWN0aXZlTmFtZSA9IGdldERhdGFOYW1lKGFjdGl2ZSk7XG4gICAgY29uc3QgY291bnQgPSBuYW1lcy5sZW5ndGggLSAxO1xuICAgIFxuICAgIGNvbnN0IGFjdGl2ZUluZGV4ID0gbmFtZXMuaW5kZXhPZihhY3RpdmVOYW1lKTtcbiAgICBjb25zdCBpbmRleCA9IGdldEluZGV4KGNvdW50LCBhY3RpdmVJbmRleCk7XG4gICAgXG4gICAgY29uc3QgbmFtZSA9IG5hbWVzW2luZGV4XTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IGVsIG9mIGZpbmQoZGlhbG9nLCBbbmFtZV0pKVxuICAgICAgICBlbC5mb2N1cygpO1xufVxuXG5mdW5jdGlvbiBjbG9zZURpYWxvZyhlbCwgZGlhbG9nLCBvaywgY2FuY2VsKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsXG4gICAgICAgIC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFtZScpXG4gICAgICAgIC5yZXBsYWNlKCdqcy0nLCAnJyk7XG4gICAgXG4gICAgaWYgKC9jbG9zZXxjYW5jZWwvLnRlc3QobmFtZSkpIHtcbiAgICAgICAgY2FuY2VsKCk7XG4gICAgICAgIHJlbW92ZShkaWFsb2cpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGNvbnN0IHZhbHVlID0gZmluZChkaWFsb2csIFsnaW5wdXQnXSlcbiAgICAgICAgLnJlZHVjZSgodmFsdWUsIGVsKSA9PiBlbC52YWx1ZSwgbnVsbCk7XG4gICAgXG4gICAgb2sodmFsdWUpO1xuICAgIHJlbW92ZShkaWFsb2cpO1xufVxuXG5jb25zdCBxdWVyeSA9IGN1cnJpZnkoKGVsZW1lbnQsIG5hbWUpID0+IGVsZW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cImpzLSR7IG5hbWUgfVwiXWApKTtcblxuZnVuY3Rpb24gZmluZChlbGVtZW50LCBuYW1lcykge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gbmFtZXNcbiAgICAgICAgLm1hcChxdWVyeShlbGVtZW50KSlcbiAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcbiAgICBcbiAgICByZXR1cm4gZWxlbWVudHM7XG59XG5cbmZ1bmN0aW9uIGFkZExpc3RlbmVyQWxsKGV2ZW50LCBwYXJlbnQsIGVsZW1lbnRzLCBmbikge1xuICAgIGZvciAoY29uc3QgZWwgb2YgZmluZChwYXJlbnQsIGVsZW1lbnRzKSkge1xuICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBmbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmUoZGlhbG9nKSB7XG4gICAgY29uc3Qge3BhcmVudEVsZW1lbnR9ID0gZGlhbG9nO1xuICAgIFxuICAgIGlmIChwYXJlbnRFbGVtZW50KVxuICAgICAgICBwYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGRpYWxvZyk7XG59XG5cbiIsImltcG9ydCB7IHByb2dyZXNzIH0gZnJvbSBcInNtYWxsdGFsa1wiO1xuXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3Mge1xuXG4gICAgY29uc3RydWN0b3IodGl0bGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgdGhpcy5wcm9ncmVzcyA9IHByb2dyZXNzKHRpdGxlLCBtZXNzYWdlKTtcbiAgICAgICAgdGhpcy5wcm9ncmVzcy5jYXRjaCgoKSA9PiB0aGlzLmFib3J0ZWQgPSB0cnVlKTtcbiAgICAgICAgdGhpcy5kaWFsb2cgPSB0aGlzLnByb2dyZXNzLmRpYWxvZztcbiAgICAgICAgdGhpcy5hYm9ydGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgYXN5bmMgZm9yRWFjaChjb2xsZWN0aW9uLCBmdW5jKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hYm9ydGVkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGxldCBwcm9jZXNzZWQgPSAwLCByYW5nZSA9IGNvbGxlY3Rpb24ubGVuZ3RoLCBhY2N1bSA9IDAsIHBjdCA9IDA7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgY29sbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZ1bmMoaXRlbSwgcHJvY2Vzc2VkKyssIGNvbGxlY3Rpb24sIHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBhY2N1bSArPSAxMDA7XG4gICAgICAgICAgICAgICAgaWYgKGFjY3VtID4gcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluZGVyID0gYWNjdW0gJSByYW5nZSwgc3RlcCA9IChhY2N1bSAtIHJlbWFpbmRlcikgLyByYW5nZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9ncmVzcy5zZXRQcm9ncmVzcyhwY3QgKz0gc3RlcCk7XG4gICAgICAgICAgICAgICAgICAgIGFjY3VtID0gcmVtYWluZGVyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwY3QgPCAxMDApXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9ncmVzcy5zZXRQcm9ncmVzcygxMDApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0IHRpdGxlKHRleHQpIHsgdGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcImhlYWRlclwiKS50ZXh0Q29udGVudCA9IHRleHQ7IH1cbiAgICBnZXQgdGl0bGUoKSB7IHJldHVybiB0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiaGVhZGVyXCIpLnRleHRDb250ZW50OyB9XG5cbiAgICBzZXQgbWVzc2FnZSh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGFyZWEgPSB0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLmNvbnRlbnQtYXJlYVwiKS5jaGlsZE5vZGVzWzBdLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICB9XG5cbiAgICBnZXQgbWVzc2FnZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIuY29udGVudC1hcmVhXCIpLmNoaWxkTm9kZXNbMF0udGV4dENvbnRlbnQ7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBwcm9tcHQgfSBmcm9tIFwic21hbGx0YWxrXCI7XG5cbmltcG9ydCBcIi4vdmFsaWRhdGlvbi5zY3NzXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZWRJbnB1dCh0aXRsZSwgbWVzc2FnZSwgdmFsdWUgPSBcIlwiLCByZWdleCA9IFwiLipcIiwgd2hhdCA9IFwiZW50cnlcIikge1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gcHJvbXB0KHRpdGxlLCBtZXNzYWdlLCB2YWx1ZSk7XG4gICAgICAgIGNvbnN0IGlucHV0RmllbGQgPSBpbnB1dC5kaWFsb2cuZmluZChcImlucHV0XCIpO1xuICAgICAgICBjb25zdCBpc1ZhbGlkID0gKHQpID0+IG5ldyBSZWdFeHAoYF4ke3JlZ2V4fSRgKS50ZXN0KHQpO1xuXG4gICAgICAgIGlucHV0RmllbGQuc2V0U2VsZWN0aW9uUmFuZ2UodmFsdWUubGVuZ3RoLCB2YWx1ZS5sZW5ndGgpO1xuICAgICAgICBpbnB1dEZpZWxkLnBhdHRlcm4gPSByZWdleDtcbiAgICAgICAgaW5wdXRGaWVsZC5vbmlucHV0ID0gKCkgPT4gaW5wdXRGaWVsZC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWludmFsaWRcIiwgIWlzVmFsaWQoaW5wdXRGaWVsZC52YWx1ZSkpO1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGlucHV0O1xuICAgICAgICBpZiAoaXNWYWxpZChyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgICAgIG5ldyBOb3RpY2UoYFwiJHtyZXN1bHR9XCIgaXMgbm90IGEgdmFsaWQgJHt3aGF0fWApO1xuICAgIH1cbn1cbiIsImltcG9ydCB7Y29uZmlybX0gZnJvbSBcInNtYWxsdGFsa1wiO1xuaW1wb3J0IHtQcm9ncmVzc30gZnJvbSBcIi4vcHJvZ3Jlc3NcIjtcbmltcG9ydCB7dmFsaWRhdGVkSW5wdXR9IGZyb20gXCIuL3ZhbGlkYXRpb25cIjtcbmltcG9ydCB7Tm90aWNlLCBwYXJzZUZyb250TWF0dGVyVGFnc30gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5hbWVUYWcoYXBwLCB0YWdOYW1lKSB7XG4gICAgdmFyIG5ld05hbWU7XG4gICAgdHJ5IHtcbiAgICAgICAgbmV3TmFtZSA9IGF3YWl0IHZhbGlkYXRlZElucHV0KFxuICAgICAgICAgICAgYFJlbmFtaW5nICMke3RhZ05hbWV9IChhbmQgYW55IHN1Yi10YWdzKWAsIFwiRW50ZXIgbmV3IG5hbWUgKG11c3QgYmUgYSB2YWxpZCBPYnNpZGlhbiB0YWcpOlxcblwiLCB0YWdOYW1lLFxuICAgICAgICAgICAgXCJbXlxcdTIwMDAtXFx1MjA2RlxcdTJFMDAtXFx1MkU3RichXFxcIiMkJSYoKSorLC46Ozw9Pj9AXmB7fH1+XFxcXFtcXFxcXVxcXFxcXFxcXFxcXHNdK1wiLFxuICAgICAgICAgICAgXCJPYnNpZGlhbiB0YWcgbmFtZVwiXG4gICAgICAgICk7XG4gICAgfVxuICAgIGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gdGFnTmFtZSkge1xuICAgICAgICByZXR1cm4gbmV3IE5vdGljZShcIlVuY2hhbmdlZCBvciBlbXB0eSB0YWc6IE5vIGNoYW5nZXMgbWFkZS5cIik7XG4gICAgfVxuXG4gICAgY29uc3QgY2xhc2ggPSB0YWdDbGFzaGVzKGFwcCwgXCIjXCIrdGFnTmFtZSwgXCIjXCIrbmV3TmFtZSk7XG4gICAgaWYgKGNsYXNoKSB7XG4gICAgICAgIHRyeSB7IGF3YWl0IGNvbmZpcm0oXG4gICAgICAgICAgICBcIldBUk5JTkc6IE5vIFVuZG8hXCIsXG4gICAgICAgICAgICBgUmVuYW1pbmcgIyR7dGFnTmFtZX0gdG8gIyR7bmV3TmFtZX0gd2lsbCBtZXJnZSBzb21lIHRhZ3NcbmludG8gZXhpc3RpbmcgdGFncyAoc3VjaCBhcyAke2NsYXNofSkuXG5cblRoaXMgPGI+Y2Fubm90PC9iPiBiZSB1bmRvbmUuICBEbyB5b3Ugd2lzaCB0byBwcm9jZWVkP2ApOyB9XG4gICAgICAgIGNhdGNoKGUpIHsgcmV0dXJuOyB9XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZXNUb1JlbmFtZSA9IGF3YWl0IHRhZ1Bvc2l0aW9ucyhhcHAsIFwiI1wiK3RhZ05hbWUpO1xuICAgIGlmICghZmlsZXNUb1JlbmFtZSkgcmV0dXJuO1xuXG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgUHJvZ3Jlc3MoYFJlbmFtaW5nIHRvICR7bmV3TmFtZX0vKmAsIFwiUHJvY2Vzc2luZyBmaWxlcy4uLlwiKTtcbiAgICBsZXQgdXBkYXRlZCA9IDA7XG4gICAgYXdhaXQgcHJvZ3Jlc3MuZm9yRWFjaChmaWxlc1RvUmVuYW1lLCBhc3luYyAoZikgPT4ge1xuICAgICAgICBwcm9ncmVzcy5tZXNzYWdlID0gXCJQcm9jZXNzaW5nIFwiICsgZi5maWxlbmFtZS5zcGxpdChcIi9cIikucG9wKCk7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGYuZmlsZW5hbWUpO1xuICAgICAgICBjb25zdCBvcmlnaW5hbCA9IGF3YWl0IGFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICBpZiAocHJvZ3Jlc3MuYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgICBsZXQgdGV4dCA9IG9yaWdpbmFsO1xuICAgICAgICBmb3IoY29uc3QgeyBwb3NpdGlvbjoge3N0YXJ0LCBlbmR9LCB0YWd9IG9mIGYpIHtcbiAgICAgICAgICAgIGlmICh0ZXh0LnNsaWNlKHN0YXJ0Lm9mZnNldCwgZW5kLm9mZnNldCkgIT09IHRhZykge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEZpbGUgJHtmLmZpbGVuYW1lfSBoYXMgY2hhbmdlZDsgc2tpcHBpbmdgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZpbGUgJHtmLmZpbGVuYW1lfSBoYXMgY2hhbmdlZDsgc2tpcHBpbmdgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKHRleHQuc2xpY2Uoc3RhcnQub2Zmc2V0LCBlbmQub2Zmc2V0KSwgdGFnKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnNsaWNlKDAsIHN0YXJ0Lm9mZnNldCkgKyBcIiNcIituZXdOYW1lICsgdGV4dC5zbGljZShzdGFydC5vZmZzZXQgKyB0YWdOYW1lLmxlbmd0aCArIDEpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRleHQgIT09IG9yaWdpbmFsKSB7IGF3YWl0IGFwcC52YXVsdC5tb2RpZnkoZmlsZSwgdGV4dCk7IHVwZGF0ZWQrKzsgfVxuICAgIH0pXG4gICAgcmV0dXJuIG5ldyBOb3RpY2UoYE9wZXJhdGlvbiAke3Byb2dyZXNzLmFib3J0ZWQgPyBcImNhbmNlbGxlZFwiIDogXCJjb21wbGV0ZVwifTogJHt1cGRhdGVkfSBmaWxlKHMpIHVwZGF0ZWRgKTtcbn1cblxuZnVuY3Rpb24gdGFnQ2xhc2hlcyhhcHAsIG9sZFRhZywgbmV3VGFnKSB7XG4gICAgY29uc3QgcHJlZml4ID0gb2xkVGFnICsgXCIvXCI7XG4gICAgY29uc3QgdGFncyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0VGFncygpKSk7XG4gICAgZm9yIChjb25zdCB0YWcgb2YgdGFncykge1xuICAgICAgICBpZiAodGFnID09PSBvbGRUYWcgfHwgdGFnLnN0YXJ0c1dpdGgocHJlZml4KSkge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IG5ld1RhZyArIHRhZy5zbGljZShvbGRUYWcubGVuZ3RoKTtcbiAgICAgICAgICAgIGlmICh0YWdzLmhhcyhjaGFuZ2VkKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gdGFnUG9zaXRpb25zKGFwcCwgdGFnTmFtZSkge1xuICAgIGNvbnN0IHByZWZpeCA9IHRhZ05hbWUgKyBcIi9cIiwgcmVzdWx0ID0gW107XG4gICAgZnVuY3Rpb24gdGFnTWF0Y2hlcyh0YWcpIHtcbiAgICAgICAgcmV0dXJuIHRhZyA9PSB0YWdOYW1lIHx8IHRhZy5zdGFydHNXaXRoKHByZWZpeCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZyb250TWF0dGVyVGFncyhmbSkge1xuICAgICAgICBpZiAoIWZtIHx8ICFmbS50YWdzKVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShmbS50YWdzKSlcbiAgICAgICAgICAgIHJldHVybiBmbS50YWdzO1xuICAgICAgICBpZiAodHlwZW9mIGZtLnRhZ3MgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICByZXR1cm4gW2ZtLnRhZ3NdO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgUHJvZ3Jlc3MoYFNlYXJjaGluZyBmb3IgJHtwcmVmaXh9KmAsIFwiTWF0Y2hpbmcgZmlsZXMuLi5cIik7XG4gICAgYXdhaXQgcHJvZ3Jlc3MuZm9yRWFjaChcbiAgICAgICAgYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Q2FjaGVkRmlsZXMoKSxcbiAgICAgICAgbiA9PiB7XG4gICAgICAgICAgICBsZXQgeyBmcm9udG1hdHRlciwgdGFncyB9ID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Q2FjaGUobik7XG4gICAgICAgICAgICB0YWdzID0gdGFncyAmJiB0YWdzLmZpbHRlcih0ID0+IHRhZ01hdGNoZXModC50YWcgfHwgXCJcIikpLnJldmVyc2UoKSB8fCBbXTsgLy8gbGFzdCBwb3NpdGlvbnMgZmlyc3RcbiAgICAgICAgICAgIHRhZ3MuZmlsZW5hbWUgPSBuO1xuICAgICAgICAgICAgdGFncy5mbXRhZ3MgPSBwYXJzZUZyb250TWF0dGVyVGFncyhmcm9udG1hdHRlcikuZmlsdGVyKHRhZ01hdGNoZXMpO1xuICAgICAgICAgICAgdGFncy5mcm9udG1hdHRlciA9IGZyb250bWF0dGVyO1xuICAgICAgICAgICAgaWYgKHRhZ3MubGVuZ3RoIHx8IHRhZ3MuZm10YWdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh0YWdzKTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgaWYgKCFwcm9ncmVzcy5hYm9ydGVkKVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IHtNZW51LCBOb3RpY2UsIFBsdWdpbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge3JlbmFtZVRhZ30gZnJvbSBcIi4vcmVuYW1pbmdcIjtcblxuZnVuY3Rpb24gb25FbGVtZW50KGVsLCBldmVudCwgc2VsZWN0b3IsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgZWwub24oZXZlbnQsIHNlbGVjdG9yLCBjYWxsYmFjaywgb3B0aW9ucylcbiAgICByZXR1cm4gKCkgPT4gZWwub2ZmKGV2ZW50LCBzZWxlY3RvciwgY2FsbGJhY2ssIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWdXcmFuZ2xlciBleHRlbmRzIFBsdWdpbiB7XG4gICAgb25sb2FkKCl7XG4gICAgICAgIHRoaXMucmVnaXN0ZXIoXG4gICAgICAgICAgICBvbkVsZW1lbnQoZG9jdW1lbnQsIFwiY29udGV4dG1lbnVcIiwgXCIudGFnLXBhbmUtdGFnXCIsIHRoaXMub25NZW51LmJpbmQodGhpcyksIHtjYXB0dXJlOiB0cnVlfSlcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlcihcbiAgICAgICAgICAgIG9uRWxlbWVudChkb2N1bWVudCwgXCJtb3VzZWRvd25cIiwgXCIudGFnLXBhbmUtdGFnXCIsICgpID0+IHt3aW5kb3cubGFzdEZvY3VzID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDt9LCB7Y2FwdHVyZTogdHJ1ZX0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgb25NZW51KGUsIHRhZ0VsKSB7XG4gICAgICAgIGNvbnN0XG4gICAgICAgICAgICB0YWdOYW1lID0gdGFnRWwuZmluZChcIi50YWctcGFuZS10YWctdGV4dFwiKS50ZXh0Q29udGVudCxcbiAgICAgICAgICAgIHRyZWVQYXJlbnQgPSB0YWdFbC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICBpc0hpZXJhcmNoeSA9IHRyZWVQYXJlbnQuZmluZChcIi5jb2xsYXBzZS1pY29uXCIpLFxuICAgICAgICAgICAgc2VhcmNoUGx1Z2luID0gdGhpcy5hcHAuaW50ZXJuYWxQbHVnaW5zLmdldFBsdWdpbkJ5SWQoXCJnbG9iYWwtc2VhcmNoXCIpLFxuICAgICAgICAgICAgc2VhcmNoID0gc2VhcmNoUGx1Z2luICYmIHNlYXJjaFBsdWdpbi5pbnN0YW5jZSxcbiAgICAgICAgICAgIHF1ZXJ5ID0gc2VhcmNoICYmIHNlYXJjaC5nZXRHbG9iYWxTZWFyY2hRdWVyeSgpLFxuICAgICAgICAgICAgbWVudSA9IG5ldyBUYWdNZW51KCkuYWRkSXRlbShpdGVtKFwicGVuY2lsXCIsIFwiUmVuYW1lICNcIit0YWdOYW1lLCAoKSA9PiB0aGlzLnJlbmFtZSh0YWdOYW1lKSkpO1xuXG4gICAgICAgIGlmIChzZWFyY2gpIHtcbiAgICAgICAgICAgIG1lbnUuYWRkU2VwYXJhdG9yKCkuYWRkSXRlbShcbiAgICAgICAgICAgICAgICBpdGVtKFwibWFnbmlmeWluZy1nbGFzc1wiLCBcIk5ldyBzZWFyY2ggZm9yICNcIit0YWdOYW1lLCAoKSA9PiBzZWFyY2gub3Blbkdsb2JhbFNlYXJjaChcInRhZzpcIiArIHRhZ05hbWUpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShcbiAgICAgICAgICAgICAgICAgICAgaXRlbShcInNoZWV0cy1pbi1ib3hcIiwgXCJSZXF1aXJlICNcIit0YWdOYW1lK1wiIGluIHNlYXJjaFwiICAsICgpID0+IHNlYXJjaC5vcGVuR2xvYmFsU2VhcmNoKHF1ZXJ5K1wiIHRhZzpcIiAgKyB0YWdOYW1lKSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVudS5hZGRJdGVtKFxuICAgICAgICAgICAgICAgIGl0ZW0oXCJjcm9zc2VkLXN0YXJcIiAsIFwiRXhjbHVkZSAjXCIrdGFnTmFtZStcIiBmcm9tIHNlYXJjaFwiLCAoKSA9PiBzZWFyY2gub3Blbkdsb2JhbFNlYXJjaChxdWVyeStcIiAtdGFnOlwiICsgdGFnTmFtZSkpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzSGllcmFyY2h5KSB7XG4gICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGUoY29sbGFwc2UpIHtcbiAgICAgICAgICAgICAgICBmb3IoY29uc3QgZWwgb2YgdHJlZVBhcmVudC5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWVsLmhhc0NsYXNzKFwidHJlZS1pdGVtXCIpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbGxhcHNlICE9PSBlbC5oYXNDbGFzcyhcImlzLWNvbGxhcHNlZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gZWwuZmluZChcIi5jb2xsYXBzZS1pY29uXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1dHRvbikgYnV0dG9uLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZW51LmFkZFNlcGFyYXRvcigpXG4gICAgICAgICAgICAuYWRkSXRlbShpdGVtKFwidmVydGljYWwtdGhyZWUtZG90c1wiLCBcIkNvbGxhcHNlIHRhZ3MgYXQgdGhpcyBsZXZlbFwiLCAoKSA9PiB0b2dnbGUodHJ1ZSApKSlcbiAgICAgICAgICAgIC5hZGRJdGVtKGl0ZW0oXCJleHBhbmQtdmVydGljYWxseVwiICAsIFwiRXhwYW5kIHRhZ3MgYXQgdGhpcyBsZXZlbFwiICAsICgpID0+IHRvZ2dsZShmYWxzZSkpKVxuICAgICAgICB9XG5cbiAgICAgICAgbWVudS5zaG93QXRQb3NpdGlvbih7eDogZS5wYWdlWCwgeTogZS5wYWdlWX0pO1xuICAgIH1cblxuICAgIGFzeW5jIHJlbmFtZSh0YWdOYW1lKSB7XG4gICAgICAgIHRyeSB7IGF3YWl0IHJlbmFtZVRhZyh0aGlzLmFwcCwgdGFnTmFtZSk7IH1cbiAgICAgICAgY2F0Y2ggKGUpIHsgY29uc29sZS5lcnJvcihlKTsgbmV3IE5vdGljZShcImVycm9yOiBcIiArIGUpOyB9XG4gICAgfVxuXG59XG5cbmNsYXNzIFRhZ01lbnUgZXh0ZW5kcyBNZW51IHtcbiAgICBsb2FkKCkge1xuICAgICAgICBzdXBlci5sb2FkKCk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXIoXG4gICAgICAgICAgICBvbkVsZW1lbnQoZG9jdW1lbnQsIFwia2V5ZG93blwiLCBcIipcIiwgdGhpcy5vbktleWRvd24uYmluZCh0aGlzKSwge2NhcHR1cmU6IHRydWV9KVxuICAgICAgICApO1xuICAgIH1cbiAgICBvbktleWRvd24oZSkge1xuICAgICAgICBpZiAoZS5rZXk9PVwiRXNjYXBlXCIpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpdGVtKGljb24sIHRpdGxlLCBjbGljaykge1xuICAgIHJldHVybiBpID0+IGkuc2V0SWNvbihpY29uKS5zZXRUaXRsZSh0aXRsZSkub25DbGljayhjbGljayk7XG59XG5cbiJdLCJuYW1lcyI6WyJjdXJyaWZ5Iiwic3RvcmUiLCJxdWVyeSIsIk5vdGljZSIsInBhcnNlRnJvbnRNYXR0ZXJUYWdzIiwiUGx1Z2luIiwiTWVudSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFFQSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSztBQUNsQjtBQUNBLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDM0Ms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
