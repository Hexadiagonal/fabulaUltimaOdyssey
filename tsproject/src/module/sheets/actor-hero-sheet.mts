import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs"; //"../helpers/effects.mjs";
//import {CONST, utils} from "./ref/commons.js";
//import {ActorSheet} from "./ref/foundry.js";


/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class fabulaUltimaOdysseyHeroSheet extends ActorSheet {
  
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["fabulaUltimaOdyssey", "sheet", "actor"],
      template: "systems/fabulaUltimaOdyssey/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/fabulaUltimaOdyssey/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  _rollListener(event:Event){
    console.log(event);
  }

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context:any) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities as Map<any, any>)) {
      v.label = game.i18n.localize(CONFIG.fabulaUltimaOdyssey.abilities[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context:any) {
    // Initialize containers.
    const gear:any[] = [];
    const features:any[] = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html:any) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if(dataset.rolltype == "attribute"){

      const templatePayload = {
        system: this.actor.system,
        primaryAttribute: dataset.selectedAttribute
      }

      const attrRollContent = await renderTemplate("systems/fabulaUltimaOdyssey/templates/partials/attribute-roll-modal.hbs", templatePayload);


      let d = new Dialog({
        title: "Attribute Roll",
        content: attrRollContent,
        buttons: {
          roll: {
            icon: '<i class="fas fa-check"></i>',
            label: "Roll!",
            callback: async (html, event) => {
              const primarySize:string = dataset.selectedAttributeSize as string;
              const secondarySize:string = $('#secondary-attribute-selector').find(":selected").val() as string;
              let modifier: number = parseInt($('#modifier').val() as string);

              if(null == modifier || undefined == modifier){
                modifier = 0;
              }
              
              let roll = new Roll(primarySize + "+" + secondarySize + "+ @mod", {mod: modifier});
              let label = dataset.label ? `Rolling ${dataset.label}` : '';
              
              let speaker = ChatMessage.getSpeaker({actor: this.actor});

              let rollOutcome = await roll.roll();

              rollOutcome.toMessage({
                speaker,
                flavor: label
              });

              // let roll = new Roll(dataset.roll, this.actor.data.data);
              // let label = dataset.label ? `Rolling ${dataset.label}` : '';
              // roll.roll().toMessage({
              //   speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              //   flavor: label
              // });

              // ChatMessage.create("Test!");
              // let actor = html.find('[name="actor"]')[0].value
              // let message = html.find('[name="message"]')[0].value
              // ChatMessage.create({content: message, speaker: {actor:actor}})
            }
          }
        //  one: {
        //   icon: '<i class="fas fa-check"></i>',
        //   label: "Option One",
        //   callback: () => console.log("Chose One")
        //  },
        //  two: {
        //   icon: '<i class="fas fa-times"></i>',
        //   label: "Option Two",
        //   callback: () => console.log("Chose Two")
        //  }
        },
        default: "two",
        render: html => console.log("Register interactivity in the rendered dialog"),
        close: html => console.log("This always is logged no matter which option is chosen")
       });
       d.render(true);
    }

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    // if (dataset.roll) {
    //   let label = dataset.label ? `[ability] ${dataset.label}` : '';
    //   let roll = new Roll(dataset.roll, this.actor.getRollData());
    //   roll.toMessage({
    //     speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    //     flavor: label,
    //     rollMode: game.settings.get('core', 'rollMode'),
    //   });
    //   return roll;
    // }
  }

}
