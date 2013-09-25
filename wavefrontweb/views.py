from pyramid.response import Response
from pyramid.view import view_config

from sqlalchemy.exc import DBAPIError

from socketio.namespace import BaseNamespace
from socketio import socketio_manage

from .models import (
    DBSession,
    MyModel,
    )

import logging

log = logging.getLogger('views')
log.setLevel(logging.DEBUG)

from gevent.queue import Queue
from wavefrontweb import orb

class WavefrontNamespace(BaseNamespace):
    def initialize(self):
        log.info("Initializing namespace")
        # self.emit
        # self.spawn
        # self.session['key']

    def on_subscribe(self, args):
        srcname, twin, tbin = args
        def wfdata_greenlet():
            try:
                log.info('starting wfdata greenlet %s %s %s' % (srcname, twin,
                                                                    tbin))
                queue = Queue()
                binner = orb.binners.get_binner(srcname, twin, tbin)
                if binner is None:
                    log.error("No such binner")
                    raise
                with binner.subscription(queue):
                    # make it dump the buffer into our queue somehow
                    log.info('dumping history')
                    self.emit('update', {'update': [bin.asdict() for bin in binner.store.itervalues()
                                                        if bin is not None]})
                    log.info('entering main loop')
                    while True:
                        update = queue.get()
                        log.info('got update from queue')
                        log.info(update)
                        update = [b.asdict() for b in update]
                        self.emit('update', {'update': update })
            except Exception, e:
                log.error("wfdata greenlet died", exc_info=True)
                raise
                # how to set unsuccessful?
        self.spawn(wfdata_greenlet)


@view_config(route_name='home', renderer='templates/index.html')
def my_view(request):
#    try:
#        one = DBSession.query(MyModel).filter(MyModel.name == 'one').first()
#    except DBAPIError:
#        return Response(conn_err_msg, content_type='text/plain', status_int=500)
#    return {'one': one, 'project': 'wavefront-web'}
    return {'project': 'wavefront-web'}

conn_err_msg = """\
Pyramid is having a problem using your SQL database.  The problem
might be caused by one of the following things:

1.  You may need to run the "initialize_wavefront-web_db" script
    to initialize your database tables.  Check your virtual 
    environment's "bin" directory for this script and try to run it.

2.  Your database server may not be running.  Check that the
    database server referred to by the "sqlalchemy.url" setting in
    your "development.ini" file is running.

After you fix the problem, please restart the Pyramid application to
try it again.
"""

@view_config(route_name="socketio")
def socketio(request):
    socketio_manage(request.environ, {"/wavefront": WavefrontNamespace},
                    request=request,
#                    json_dumps=WavefrontJSONEncoder.encode,
                   )
    return Response('')

