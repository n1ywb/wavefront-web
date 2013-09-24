import time

import gevent.monkey
gevent.monkey.patch_all()

from gevent.queue import Queue

from pyramid.config import Configurator
from sqlalchemy import engine_from_config
from wavefront.controller import App as WfController

import logging

from contextlib import contextmanager

#from antelope import brttpkt

#from wavefront.test import make_mock_proc_orb, makepkt


log = logging.getLogger('wavefront-web')

from .models import (
    DBSession,
    Base,
    )


import sys

def _janitor(src):
    log.critical("Waveform controller died")
    sys.exit(1)

#for n in xrange(2):
#    brttpkt.get_rvals.appendleft((n, 'foobar', n*5, makepkt(n*5)))

class Publisher(object):
    def __init__(self, block_on_full=False):
        self._queues = set()
        self.block_on_full = block_on_full

    def publish(self, obj):
        for queue in self._queues:
            try:
                queue.put(obj, block=self.block_on_full)
            except Full:
                log.warning("queue overflow")

    @contextmanager
    def subscription(self, queue):
        """Subscribe queue

        :param queue: The queue to which you would like packets to be published
        :type queue: Instance of ``Queue`` or compatible

        Example::

            queue = Queue()
            with publisher.subscription(queue):
                while True:
                    pickledpacket = queue.get()
                    ...
        """
        self._queues.add(queue)
        try:
            yield
        finally:
            # Stop publishing
            self._queues.remove(queue)


publisher = Publisher()

def cb(update):
    publisher.publish(update)

twin = 600

wfcontroller = WfController()
wfcontroller.link_exception(_janitor)
orb = wfcontroller.add_orb('anfexport:usarrayTA', cb, select='TA_058A.*',
        tafter=time.time() - twin)
orb.add_binner('TA_058A_BHN', twin=twin, tbin=1.0)
#make_mock_proc_orb(2, wfcontroller, orb)
wfcontroller.start()

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine
    config = Configurator(settings=settings)
    config.add_renderer('.html', "pyramid.mako_templating.renderer_factory")
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_route('home', '/')
    config.add_route('socketio', 'socket.io/*remaining')
    config.scan()
    return config.make_wsgi_app()


