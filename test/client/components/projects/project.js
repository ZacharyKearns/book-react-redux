import pick from 'lodash/pick';
import sinon from 'sinon';

import ConnectedProject, {
  ProjectComponent,
  mapStateToProps,
  mapDispatchToProps,
  initialDispatch,
} from '_components/projects/project';

import {
  expect,
  loadJSDOM,
  dropJSDOM,
  shallowRender,
  deepRender,
  mockStore,
  actionExpects,
} from '_test/utils/renderers';


import {
  PROJECT_BY_ID,
  DELETE_PROJECT,
  REQUEST_SENT,
  REPLY_RECEIVED,
} from '_store/actions';

import {
  CALL_HISTORY_METHOD,
} from 'react-router-redux';

import data from '_test/utils/data';
import fetchMock from 'fetch-mock';

const API = `${HOST}:${PORT}${REST_API_PATH}/projects/`;

const PID = '25';
const BAD_PID = '99';

describe('Component: Project', () => {
  describe('Shallow Render', () => {
    it('ProjectComponent with pid 25 should return entry', () => {
      const onEditClick = sinon.spy();
      const onDeleteClick = sinon.spy();
      const result = shallowRender(ProjectComponent, Object.assign({},
        pick(data.projects[PID], 'pid', 'name', 'descr'),
        {
          onEditClick,
          onDeleteClick,
        }
      ));
      expect(result.find('h1')).to.contain.text(data.projects[PID].name);
      expect(result.find('h1').parent().last()).to.contain.text(data.projects[PID].descr);
      expect(result.find('button')).to.have.lengthOf(2);
      expect(result.find('Connect(TaskListComponent)')).to.have.lengthOf(1);
      expect(result.find('Connect(TaskListComponent)')).to.have.prop('pid', PID);
    });
    it('ProjectComponent with no name should return not found message', () => {
      const onEditClick = sinon.spy();
      const onDeleteClick = sinon.spy();
      const result = shallowRender(ProjectComponent, {
        pid: BAD_PID,
        onEditClick,
        onDeleteClick,
      });
      expect(result).to.contain.text(`Project ${BAD_PID} not found`);
    });
  });
  describe('DOM renderers', () => {
    before(loadJSDOM);
    after(dropJSDOM);
    afterEach(fetchMock.restore);

    it('deepRender ProjectComponent', () => {
      const onEditClick = sinon.spy();
      const onDeleteClick = sinon.spy();
      const result = deepRender(ProjectComponent, Object.assign({},
        pick(data.projects[PID], 'pid', 'name', 'descr'),
        {
          onEditClick,
          onDeleteClick,
        }
      ));
      const heading = result.find('.project').childAt(0);
      expect(heading.find('h1')).to.contain.text(data.projects[PID].name);
      expect(heading.find('h1').parent().last()).to.contain.text(data.projects[PID].descr);
      expect(heading.find('button')).to.have.lengthOf(2);
      expect(result.find('Connect(TaskListComponent)')).to.have.lengthOf(1);
      expect(result.find('Connect(TaskListComponent)')).to.have.prop('pid', PID);
    });

    it('deepRender ConnectedProject with existing pid', () => {
      const store = mockStore(data);
      const result = deepRender(
        ConnectedProject,
        { params: { pid: PID } },
        store
      );
      const heading = result.find('.project').childAt(0);
      expect(heading.find('h1')).to.contain.text(data.projects[PID].name);
      expect(heading.find('h1').parent().last()).to.contain.text(data.projects[PID].descr);
      expect(heading.find('button')).to.have.lengthOf(2);
      expect(result.find('Connect(TaskListComponent)')).to.have.lengthOf(1);
      expect(result.find('Connect(TaskListComponent)')).to.have.prop('pid', PID);
    });

    it('ConnectedProject with non-existing pid', () => {
      fetchMock.get(API + BAD_PID, 404);

      const store = mockStore(data);
      const result = deepRender(
        ConnectedProject,
        { params: { pid: BAD_PID } },
        store
      );
      expect(result).to.contain.text(`Project ${BAD_PID} not found`);

      return actionExpects(store,
        {
          type: PROJECT_BY_ID,
          payload: { pid: BAD_PID },
          meta: { asyncAction: REQUEST_SENT },
        },
        action => {
          expect(action.type).to.equal(PROJECT_BY_ID);
          expect(action.error).to.be.true;
          expect(action.payload.status).to.equal(404);
        }
      );
    });
  });

  it('mapStateToProps', () => {
    const props = mapStateToProps(data, { params: { pid: PID } });
    expect(props).to.eql(data.projects[PID]);
  });

  describe('mapDispatchToProps', () => {
    afterEach(fetchMock.restore);

    it('onEditClick', () => {
      const store = mockStore(data);
      const props = mapDispatchToProps(store.dispatch);
      expect(props.onEditClick).to.be.a('function');
      props.onEditClick({ pid: PID });
      return actionExpects(store, action => {
        const payload = action.payload;
        expect(payload.args).to.have.lengthOf(1);
        expect(payload.args[0]).to.equal(`/projects/editProject/${PID}`);
      });
    });

    it('onDeleteClick', () => {
      fetchMock.delete(API + PID, { pid: PID });
      const store = mockStore(data);
      const props = mapDispatchToProps(store.dispatch);
      expect(props.onDeleteClick).to.be.a('function');
      props.onDeleteClick({ pid: PID });
      return actionExpects(store,
        {
          type: DELETE_PROJECT,
          payload: { pid: PID },
          meta: { asyncAction: REQUEST_SENT },
        },
        {
          type: DELETE_PROJECT,
          payload: { pid: PID },
          meta: { asyncAction: REPLY_RECEIVED },
        },
        action => {
          expect(action.type).to.equal(CALL_HISTORY_METHOD);
          const payload = action.payload;
          expect(payload.args).to.have.lengthOf(1);
          expect(payload.args[0]).to.equal('/projects');
        }
      );
    });
  });

  describe('initialDispatch', () => {
    it('with no pid', () => {
      const store = mockStore(data);
      const ret = initialDispatch(store.dispatch, store.getState(), { params: {} });
      expect(ret).to.be.undefined;
    });

    it('with existing pid', () => {
      const store = mockStore(data);
      initialDispatch(store.dispatch, store.getState(), { params: { pid: PID } });
      expect(store.getActions()).to.have.lengthOf(0);
    });

    it('with new pid', () => {
      const store = mockStore(data);
      initialDispatch(store.dispatch, store.getState(), { params: { pid: BAD_PID } });
      const actions = store.getActions();
      expect(actions[0]).to.eql({
        type: PROJECT_BY_ID,
        payload: { pid: BAD_PID },
        meta: { asyncAction: REQUEST_SENT },
      });
    });
  });
});
