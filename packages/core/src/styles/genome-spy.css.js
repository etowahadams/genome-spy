const css = `.genome-spy {
  font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  position: relative;
}
.genome-spy canvas {
  transform: scale(1, 1);
  opacity: 1;
  transition: transform 0.6s, opacity 0.6s;
}
.genome-spy .loading-message {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.genome-spy .loading-message .message {
  color: #666;
  opacity: 0;
  transition: opacity 0.7s;
}
.genome-spy.loading canvas {
  transform: scale(0.95, 0.95);
  opacity: 0;
}
.genome-spy.loading .loading-message .message {
  opacity: 1;
}
.genome-spy.loading .ellipsis {
  animation: blinker 1s linear infinite;
}
@keyframes blinker {
  50% {
    opacity: 0;
  }
}
.genome-spy .tooltip {
  position: absolute;
  max-width: 450px;
  overflow: hidden;
  background: #f6f6f6;
  padding: 10px;
  font-size: 13px;
  box-shadow: 0px 3px 15px 0px rgba(0, 0, 0, 0.21);
  pointer-events: none;
  z-index: 100;
}
.genome-spy .tooltip > :last-child {
  margin-bottom: 0;
}
.genome-spy .tooltip > .title {
  padding-bottom: 5px;
  margin-bottom: 5px;
  border-bottom: 1px dashed #b6b6b6;
}
.genome-spy .tooltip .summary {
  font-size: 12px;
}
.genome-spy .tooltip table {
  border-collapse: collapse;
}
.genome-spy .tooltip table:first-child {
  margin-top: 0;
}
.genome-spy .tooltip table th,
.genome-spy .tooltip table td {
  padding: 2px 0.4em;
  vertical-align: top;
}
.genome-spy .tooltip table th:first-child,
.genome-spy .tooltip table td:first-child {
  padding-left: 0;
}
.genome-spy .tooltip table th {
  text-align: left;
  font-weight: bold;
}
.genome-spy .tooltip .color-legend {
  display: inline-block;
  width: 0.8em;
  height: 0.8em;
  margin-left: 0.4em;
  box-shadow: 0px 0px 3px 1px white;
}
.genome-spy .tooltip .attributes .hovered {
  background-color: #e0e0e0;
}
.genome-spy .tooltip .na {
  color: #aaa;
  font-style: italic;
  font-size: 80%;
}
.genome-spy .gene-track-tooltip .summary {
  font-size: 90%;
}
.genome-spy .message-box {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  height: 100%;
  width: 100%;
}
.genome-spy .message-box > div {
  border: 1px solid red;
  padding: 10px;
  background: #fff0f0;
}`;

export default css;
