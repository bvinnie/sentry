import marked from "marked";
import React from "react";
import api from "../../api";
import GroupStore from "../../stores/groupStore";
import IndicatorStore from "../../stores/indicatorStore";
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var NoteInput = React.createClass({
  mixins: [PureRenderMixin],

  getInitialState() {
    var {item} = this.props;
    var updating = !!item;

    return {
      loading: false,
      error: false,
      errorJSON: null,
      expanded: false,
      preview: false,
      updating: updating,
      value: updating ? item.data.text : ''
    };
  },

  toggleEdit() {
    this.setState({preview: false});
  },

  togglePreview() {
    this.setState({preview: true});
  },

  onSubmit(e) {
    e.preventDefault();
    this.submitForm();
  },

  submitForm() {
    this.setState({
      loading: true,
      error: false,
      errorJSON: null,
    });

    if (this.state.updating) {
      this.update();
    } else {
      this.create();
    }
  },

  create() {
    var {group} = this.props;

    var loadingIndicator = IndicatorStore.add('Posting comment..');

    api.request('/groups/' + group.id + '/notes/', {
      method: 'POST',
      data: {
        text: this.state.value
      },
      error: (error) => {
        this.setState({
          loading: false,
          preview: false,
          error: true,
          errorJSON: JSON.parse(error.responseJSON)
        });
      },
      success: (data) => {
        this.setState({
          value: '',
          preview: false,
          expanded: false,
          loading: false
        });
        GroupStore.addActivity(group.id, data);
        this.finish();
      },
      complete: () => {
        IndicatorStore.remove(loadingIndicator);
      }
    });
  },

  update() {
    var {group, item} = this.props;

    var loadingIndicator = IndicatorStore.add('Updating comment..');

    api.request('/groups/' + group.id + '/notes/' + item.id + '/', {
      method: 'PUT',
      data: {
        text: this.state.value
      },
      error: (error) => {
        this.setState({
          loading: false,
          preview: false,
          error: true,
          errorJSON: JSON.parse(error.responseJSON)
        });
      },
      success: (data) => {
        this.setState({
          preview: false,
          expanded: false,
          loading: false
        });
        GroupStore.updateActivity(group.id, item.id, {text: this.state.value});
        this.finish();
      },
      complete: () => {
        IndicatorStore.remove(loadingIndicator);
      }
    });
  },

  onChange(e) {
    this.setState({value: e.target.value});
  },

  onKeyDown(e) {
    // Auto submit the form on [meta] + Enter
    e.key === 'Enter' && e.metaKey && this.submitForm();
  },

  onCancel(e) {
    e.preventDefault();
    this.finish();
  },

  finish() {
    this.props.onFinish && this.props.onFinish();
  },

  expand(e) {
    this.setState({expanded: true});

    // HACK: Move cursor to end of text after autoFocus
    // we do this my making sure this is only done on the first
    // onFocus event
    if (!this.state._hasFocused) {
      this.setState({_hasFocused: true});
      var value = e.target.value;
      e.target.value = '';
      e.target.value = value;
    }

  },

  maybeCollapse() {
    if (this.state.value === '') {
      this.setState({expanded: false});
    }
  },

  render() {
    var {error, errorJSON, loading, preview, updating, value} = this.state;
    var classNames = 'activity-field';
    if (error) {
      classNames += ' error';
    }
    if (loading) {
      classNames += ' loading';
    }

    var btnText = updating ? 'Save' : 'Post';

    return (
      <form className={classNames} onSubmit={this.onSubmit}>
        <div className="activity-notes">
          <ul className="nav nav-tabs">
            <li className={!preview ? "active" : ""}>
              <a onClick={this.toggleEdit}>{updating ? "Edit" : "Write"}</a>
            </li>
            <li className={preview ? "active" : ""}>
              <a onClick={this.togglePreview}>Preview</a>
            </li>
          </ul>
          {preview ?
            <div className="note-preview"
                 dangerouslySetInnerHTML={{__html: marked(value)}} />
          :
            <textarea placeholder="Add details or updates to this event"
                      onChange={this.onChange}
                      onKeyDown={this.onKeyDown}
                      onFocus={this.expand} onBlur={this.maybeCollapse}
                      required={true}
                      autoFocus={true}
                      value={value} />
          }
          <div className="activity-actions">
            {errorJSON && errorJSON.detail &&
              <small className="error">{errorJSON.detail}</small>
            }
            <button className="btn btn-default" type="submit"
                    disabled={loading}>{btnText} Comment</button>
            {updating &&
              <button className="btn btn-danger" onClick={this.onCancel}>Cancel</button>}
          </div>
        </div>
      </form>
    );
  }
});

export default NoteInput;