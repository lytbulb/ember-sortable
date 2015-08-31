import Ember from 'ember';
import computed from 'ember-new-computed';

export default Ember.Service.extend({

	/**
	* @type {Array.<SortableGroup>} group
	*/
	groups: computed(() => Ember.A()).readOnly(),

	/**
	* @param {SortableGroup} group
	*/
	register(group) {
		this.get('groups').addObject(group);
	},

	/**
	* @param {SortableGroup} group
	*/
	unregister(group) {
		this.get('groups').removeObject(group);
	},

	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleDragStart(item, group) {
		this.subscribe(item, group);

		group.set('inviteDrop', true);

		item.setProperties({
			source: group,
			insertAt: group.indexOf(item),
			removeAt: group.indexOf(item)
		});
	},

	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseEnter(item, group) {
		if (group.isConnected(item.get('source'))) {
			group.set('inviteDrop', true);
			item.set('group', group);
			item.get('source').update();
		}
	},

	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseLeave(item, group) {
		let source = item.get('source');

		item.set('group', null);

		group.set('inviteDrop', false);

		// update the group as the item is no longer in it
		if (group !== source) {
			group.update();
		}

		// highlight item's original position in the source
		source.welcome(item.get('removeAt'), item);
	},

	/**
	* @param {SortableItem} item
	*/
	handleDrop(item) {

		this.unsubscribe();

		// if item is dropped outside any group
		if (!item.get('group')) {
			// we will set its group back to source
			item.set('group', item.get('source'));
			item.get('group').welcome(item.get('removeAt'), item);
		} else {
			item.get('group').update();
		}

	},

	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleCommit(item, group) {
		let source = item.get('source'),
			removeAt = item.get('removeAt'),
			insertAt = item.get('insertAt');

		group.cleanup();
		source.cleanup();

		if (group === source && insertAt !== removeAt) {
			group.sendAction('onMove', item.get('model'), group.get('model'), insertAt, group.get('unique'));
		}
		else if (group !== source) {
			source.sendAction('onRemove', item.get('model'), source.get('model'), removeAt, source.get('unique'));
			group.sendAction('onAdd', item.get('model'), group.get('model'), insertAt, group.get('unique'));
		}

		group.sendAction('onAll', item.get('model'), source.get('model'), removeAt, group.get('model'), insertAt, group.get('unique'))
	},

	/**
	* @param {SortableItem} item
	*/
	subscribe(item, source) {
		this.get('groups').forEach(group => {
			group.setProperties({
				acceptsDrop: group.get('connect') === source.get('connect'),
				rejectsDrop: group.get('connect') !== source.get('connect'),
			});

			group.get('resolvedDropTarget').setProperties({
				mouseEnter: this.handleGroupMouseEnter.bind(this, item, group),
				mouseLeave: this.handleGroupMouseLeave.bind(this, item, group)
			});
		});
	},

	unsubscribe() {
		this.get('groups').forEach(group => {
			group.setProperties({
				acceptsDrop: null,
				rejectsDrop: null
			});

			group.get('resolvedDropTarget').setProperties({
				mouseEnter: null,
				mouseLeave: null
			});
		});
	}

});
