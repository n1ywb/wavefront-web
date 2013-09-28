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
#orb = wfcontroller.add_orb('anfexport:usarrayTA', select='TA_058A.*', tafter=time.time() - twin)
#orb.add_binner('TA_058A_BHZ', twin=3600.0, tbin=10.0)
#orb.add_binner('TA_058A_BHZ', twin=7200.0, tbin=20.0)
#orb.add_binner('TA_058A_BHZ', twin=86400.0, tbin=240.0)
#orb.add_binner('TA_058A_LHZ', twin=86400.0, tbin=240.0)
#orb.add_binner('TA_058A_LDM_EP', twin=86400.0, tbin=10.0)
#make_mock_proc_orb(2, wfcontroller, orb)

srcs = """
TA_TOLK_BHZ_01 TA_HDA_BHZ TA_D50A_BHZ TA_D56A_BHZ TA_E44A_BHZ TA_E47A_BHZ
TA_E53A_BHZ TA_F61A_BHZ TA_F48A_BHZ TA_G54A_BHZ TA_G47A_BHZ TA_H48A_BHZ
TA_H55A_BHZ TA_I48A_BHZ TA_I49A_BHZ TA_J46A_BHZ TA_K48A_BHZ TA_K43A_BHZ
TA_L55A_BHZ TA_L46A_BHZ TA_M59A_BHZ TA_M55A_BHZ TA_M58A_BHZ TA_N51A_BHZ
TA_N60A_BHZ TA_N50A_BHZ TA_O56A_BHZ TA_O54A_BHZ TA_O52A_BHZ TA_P46A_BHZ
TA_P56A_BHZ TA_Q56A_BHZ TA_Q55A_BHZ TA_Q61A_BHZ TA_R52A_BHZ TA_R49A_BHZ
TA_R58B_BHZ TA_S44A_BHZ TA_S51A_BHZ TA_T55A_BHZ TA_T57A_BHZ TA_U54A_BHZ
TA_U58A_BHZ TA_U56A_BHZ TA_V56A_BHZ TA_V60A_BHZ TA_W50A_BHZ TA_W51A_BHZ
TA_W52A_BHZ TA_X59A_BHZ TA_X56A_BHZ TA_Y57A_BHZ TA_Y51A_BHZ TA_Y12C_BHZ
TA_Z53A_BHZ TA_Z52A_BHZ TA_156A_BHZ TA_253A_BHZ TA_214A_BHZ TA_353A_BHZ
TA_455A_BHZ TA_552A_BHZ TA_655A_BHZ TA_857A_BHZ TA_058A_BHZ TA_062Z_BHZ
""".split()

selectsrcs = []
for src in srcs:
    parts = src.split('_')
    selectsrcs.append('%s_%s.*' % (parts[0], parts[1]))
select = '|'.join(selectsrcs)

orb = wfcontroller.add_orb('anfexport:usarrayTA', select=select,
                                tafter=time.time() - 86400)

for src in srcs:
    orb.add_binner(src, twin=86400.0, tbin=240.0)
    orb.add_binner(src, twin=7200.0, tbin=20.0)


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
    config.add_route('foo', '/foo')
    config.add_route('home', '/')
    config.add_route('socketio', 'socket.io/*remaining')
    config.scan()
    return config.make_wsgi_app()


