/**
 * @typedef {Object} UGLAGanttOptions
 * @prop {Object} theming
 * @prop {Object} theming.connectingLines
 * @prop {String} [theming.connectingLines.class=`gantt__connecting_line`]
 */
class UGLAGanttOptions
{
  theming = {
    connectingLines: {
      class: `gantt__connecting_line`
    },
  };
}

export default UGLAGanttOptions;