// Import document classes.
import { fabulaUltimaOdysseyActor } from "./documents/actor.mjs";
import { fabulaUltimaOdysseyItem } from "./documents/item.mjs";

// Import sheet classes.
import { fabulaUltimaOdysseyActorSheet } from "./sheets/actor-sheet.mjs";

import { fabulaUltimaOdysseyHeroSheet } from "./sheets/actor-hero-sheet.mjs";

import { fabulaUltimaOdysseyItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { fabulaUltimaOdyssey } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  CONFIG.debug.hooks = true;
  console.warn("Initializing Fabula Ultima Odyssey module.");

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.fabulaUltimaOdyssey = {
    fabulaUltimaOdysseyActor,
    fabulaUltimaOdysseyItem,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.fabulaUltimaOdyssey = fabulaUltimaOdyssey;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20 + @abilities.dex.mod",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = fabulaUltimaOdysseyActor;
  CONFIG.Item.documentClass = fabulaUltimaOdysseyItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  // Actors.registerSheet("fabulaUltimaOdyssey", fabulaUltimaOdysseyActorSheet, { types:["character"], makeDefault: true });

  Actors.registerSheet("fabulaUltimaOdyssey", fabulaUltimaOdysseyHeroSheet, { types:["hero", "npc", "villain", "bestiary"], makeDefault: true });

  // Items.unregisterSheet("core", ItemSheet);
  // Items.registerSheet("fabulaUltimaOdyssey", fabulaUltimaOdysseyItemSheet, { makeDefault: true });

  //Actors.registerSheet("fabulaUltimaOdyssey", fabulaUltimaOdysseyHeroSheet, { makeDefault: false });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

Hooks.once("updateActor", async function(d, c, o, u) {
  console.log("doc", d);
  console.log("change", c);

});

Hooks.once("preUpdateActor", async function(document, changes, options, userId){
  console.log("Pre upload doc", document);
  console.log("Pre upload changes", changes)
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('isEqual', function(a, b) {
  return a == b;
});

Handlebars.registerHelper('notEqual', function(a, b) {
  return a != b;
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.fabulaUltimaOdyssey.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "fabulaUltimaOdyssey.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.roll();
  });
}