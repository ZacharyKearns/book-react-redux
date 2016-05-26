import React from 'react';
import { render } from 'react-dom';
import { Router, browserHistory } from 'react-router';

import routes from './routes.js';

const dest = document.getElementById('contents');

export default render((
  <Router history={browserHistory}>
    {routes}
  </Router>
), dest);
