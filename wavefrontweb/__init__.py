from collections import defaultdict
import time

import gevent.monkey
gevent.monkey.patch_all()

from gevent.queue import Queue

from pyramid.config import Configurator
from sqlalchemy import engine_from_config
from wavefront.controller import App as WfController

import logging

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

twin = 86400.0

wfcontroller = WfController()
wfcontroller.link_exception(_janitor)
orb = wfcontroller.add_orb('anfexport:usarrayTA', select='TA_058A.*', tafter=time.time() - twin)
orb.add_binner('TA_058A_BHZ', twin=3600.0, tbin=10.0)
#orb.add_binner('TA_058A_BHZ', twin=7200.0, tbin=20.0)
#orb.add_binner('TA_058A_BHZ', twin=86400.0, tbin=240.0)
#orb.add_binner('TA_058A_LHZ', twin=86400.0, tbin=240.0)
#orb.add_binner('TA_058A_LDM_EP', twin=86400.0, tbin=10.0)
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


