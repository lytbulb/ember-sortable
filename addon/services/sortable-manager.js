import Ember from 'ember';
import computed from 'ember-new-computed';

export default Ember.Service.extend({

	groups: computed(() => Ember.A()).readOnly(),

	register(group) {
		this.get('groups').push(group);
	},
	
	/**
	* Index where the item is meant to be inserted.
	* @type {Number}
	*/
	insertAt: null,
	
	/**
	* Index where the item is meant to be removed.
	* @type {Number}
	*/
	removeAt: null,
	
	/**
	* Group from which the item is being dragged.
	* @type {SortableGroup}
	*/
	source: null,
	
	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleDragStart(item, group) {
		this.subscribe(item, group);
		group.set('acceptsDrop', true);
		
		this.setProperties({
			source: group,
			insertAt: group.get('model').indexOf(item.get('model')),
			removeAt: group.get('model').indexOf(item.get('model'))
		});
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseEnter(item, group) {
		if (group.isConnected(this.get('source'))) {
			group.set('inviteDrop', true);
			item.set('group', group);
			this.get('source').update();
		}
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseLeave(item, group) {
		let source = this.get('source');
	
		item.set('group', null);
		
		group.set('inviteDrop', false);
		
		// update the group as the item is no longer in it
		if (group !== source) {
			group.update();
		}
		
		// highlight item's original position in the source
		source.welcome(this.get('removeAt'), item);
	},
	
	/**
	* @param {SortableItem} item
	*/
	handleDrop(item) {
		
		this.unsubscribe();
		
		if (!item.get('group')) {
			item.set('group', this.get('source'));
			item.get('group').home(this.get('removeAt'), item);
		} else {
			item.get('group').update();
		}
		
	},
	
	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleCommit(item, group) {
		let source = this.get('source'),
			removeAt = this.get('removeAt'),
			insertAt = this.get('insertAt');
			
		group.cleanup();
		source.cleanup();
		
		if (group === source && insertAt !== removeAt) {
			group.sendAction('onMove', item.get('model'), group.get('model'), insertAt);
		}
		else if (group !== source) {
			source.sendAction('onRemove', item.get('model'), source.get('model'), removeAt);
			group.sendAction('onAdd', item.get('model'), group.get('model'), insertAt);
		}
	},
	
	/**
	* @param {SortableItem} item
	*/
	subscribe(item, source) {
		this.get('groups').forEach(group => {
			group.setProperties({
				acceptsDrop: group.get('connect') === source.get('connect'),
				rejectsDrop: group.get('connect') !== source.get('connect'),
				mouseEnter: this.handleGroupMouseEnter.bind(this, item, group),
				mouseLeave: this.handleGroupMouseLeave.bind(this, item, group)
			});
		});
	},
	
	unsubscribe() {
		this.get('groups').forEach(group => {
			group.setProperties({
				rejectsDrop: null,
				mouseEnter: null,
				mouseLeave: null
			});
		});
	}

});
