'use strict';

var $panel = $bundle.filter('.status');
var $logo = $panel.find('.details-logo');

var session = nodecg.Replicant('session');
session.on('change', function(oldVal, newVal) {
    if (!newVal) {
        $panel.find('.sessionInactive').show();
        $panel.find('.sessionActive').hide();
    } else {
        $panel.find('.alert').remove();
        $panel.find('.sessionInactive').hide();
        $panel.find('.sessionActive').show();
        $logo.attr('src', newVal.logo);
    }
});

nodecg.listenFor('destroyed', function(username) {
    $panel.find('.panel-body').prepend(
        '<div class="alert alert-dismissible alert-danger" role="alert">' +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                '<span aria-hidden="true">×</span>' +
            '</button>' +
            '<strong>Signed out!</strong> '+username+'\'s session expired. Have them refresh to sign back in!' +
        '</div>');
});
