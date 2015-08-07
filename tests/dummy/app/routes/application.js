import Ember from 'ember';
const a = Ember.A;

export default Ember.Route.extend({
  
  model() {
    return {
      one: a(['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco']),
      two: a(['One', 'Two', 'Three', 'Four', 'Five'])
    };
  },

  actions: {
    
    add(item, source, index) {
    	source.insertAt(index, item);
    },
    
    remove(item, source, index) {
    	source.removeObject(item);
    },
    
    move(item, source, index) {
    	source.removeObject(item).insertAt(index, item);
    }
    
  }
});
