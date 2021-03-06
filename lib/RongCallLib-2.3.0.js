var RongIMLib; (function(b) {
    var a = (function() {
        function c(f) {
            this._memorySessions = {
                timeoutMillis: 30000,
                resolution: "480p",
                maxFrameRate: 15,
                videoSize: {
                    height: 300,
                    width: 400
                },
                container: {
                    local: null,
                    remote: null
                },
                remoteStreamList: {},
                startVoIPTime: 0,
                isActiveCall: false,
                message: null,
                getChildNode: function(h, i) {
                    var j = document.createElement("div");
                    j.id = h + "_" + i;
                    j.className = "rong-calllib-remote";
                    return j
                }
            };
            var g = this;
            if (f && f.container) {
                g._memorySessions.container = f.container
            } else {
                throw new Error("Error:VIDEO_CONTAINER_IS_NULL.")
            }
            var d = document.createElement("script");
            var e = document.getElementsByTagName("head")[0];
            d.src = "//cdn.ronghub.com/AgoraRtcAgentSDK-1.4.2.js";
            e.appendChild(d);
            d.onload = function() {
                g._memorySessions.client = AgoraRTC.createRtcClient();
                g._memorySessions.client.on("stream-added",
                function(h) {
                    var i = h.stream;
                    g._memorySessions.client.subscribe(i,
                    function(j) {
                        console.log("Subscribe stream failed", j)
                    })
                });
                g._memorySessions.client.on("peer-leave",
                function(h) {
                    for (var i in g._memorySessions.remoteStreamList) {
                        if (i == h.uid) {
                            g._memorySessions.remoteStreamList[i].stop();
                            delete g._memorySessions.remoteStreamList[i];
                            break
                        }
                    }
                    if (g.isEmptyObject()) {
                        g._memorySessions.localStream.stop();
                        g._memorySessions.client.close()
                    }
                });
                g._memorySessions.client.on("stream-subscribed",
                function(h) {
                    var i = h.stream;
                    g._memorySessions.remoteStreamList[i.getId()] = i;
                    g.displayStream(i)
                });
                g._memorySessions.client.on("stream-removed",
                function(h) {
                    var i = h.stream
                })
            }
        }
        c.init = function(d) {
            this._instance = new c(d);
            this._rongIMClient = b.RongIMClient.getInstance();
            b.RongIMClient._voipProvider = this._instance
        };
        c.getInstance = function() {
            if (!this._instance) {
                throw new Error("RongCallLib is not init!")
            }
            return this._instance
        };
        c.prototype.startCall = function(g, f, j, e, d, k) {
            if (this._memorySessions.isActiveCall) {
                k.onError(b.ErrorCode.BUSYLINE);
                return
            }
            var h = this;
            var i = "chnl_" + f;
            if (i.length > 63) {
                i = i.substr(0, 63)
            }
            h._memorySessions.startCallback = k;
            h._memorySessions.mediaType = e;
            c._rongIMClient.getAgoraDynamicKey(1, i, {
                onSuccess: function(l) {
                    h._memorySessions[i] = new b.ChannelInfo(i, l.dynamicKey);
                    var m = new b.InviteMessage({
                        callId: i,
                        engineType: 1,
                        channelInfo: h._memorySessions[i],
                        mediaType: e,
                        inviteUserIds: j,
                        extra: d
                    });
                    h.sendMessage(g, f, m, {
                        onSuccess: function(n) {
                            k.onSuccess();
                            h._memorySessions.sentTime = n.sentTime;
                            h._memorySessions.timer = setTimeout(function() {
                                h.hungupCall(g, f, b.ErrorCode.REMOTE_BUSYLINE)
                            },
                            h._memorySessions.timeoutMillis)
                        },
                        onError: k.onError
                    })
                },
                onError: function(l) {
                    k.onError(l)
                }
            })
        };
        c.prototype.hungupCall = function(l, i, f) {
            var g = this,
            j = false;
            g.closeRemoteStream();
            if (!g.isEmptyObject() || g._memorySessions.isActiveCall) {
                g._memorySessions.client.leave();
                g._memorySessions.client.close()
            }
            g._memorySessions.isActiveCall = false;
            var k = g._memorySessions["chnl_" + i];
            if (k) {
                var d = new b.HungupMessage({
                    callId: k.Id,
                    reason: b.ErrorCode.REMOTE_HANGUP
                });
                g.sendMessage(l, i, d)
            }
            var h = new b.HungupMessage({
                callId: b.Bridge._client.userId,
                reason: f
            });
            var e = new b.Message();
            e.conversationType = l;
            e.targetId = i;
            e.messageDirection = b.MessageDirection.SEND;
            e.messageType = "HungupMessage";
            e.content = h;
            g.onReceived(e)
        };
        c.prototype.joinCall = function(d, g) {
            if (this._memorySessions.isActiveCall) {
                g.onError(b.ErrorCode.BUSYLINE);
                return
            }
            var e = this;
            var f = e._memorySessions.message.content;
            c._rongIMClient.getAgoraDynamicKey(1, f.callId, {
                onSuccess: function(h) {
                    e._memorySessions.client.init(h.dynamicKey,
                    function(i) {
                        var j = new b.AcceptMessage({
                            callId: f.callId,
                            mediaType: f.mediaType
                        });
                        e.sendMessage(e._memorySessions.message.conversationType, e._memorySessions.message.targetId, j, {
                            onSuccess: function(k) {
                                e._memorySessions.client.join(h.dynamicKey, f.callId, k.sentTime & 2147483647,
                                function(l) {
                                    e._memorySessions.startVoIPTime = +new Date;
                                    e._memorySessions.isActiveCall = true;
                                    e._memorySessions.mediaType = f.mediaType;
                                    e.initLocalStream(l, f.mediaType);
                                    g.onSuccess()
                                })
                            },
                            onError: g.onError
                        })
                    },
                    function(i) {
                        if (i) {
                            switch (i.reason) {
                            case "CLOSE_BEFORE_OPEN":
                                g.onError(b.ErrorCode.CLOSE_BEFORE_OPEN);
                                g.onError(i);
                                break;
                            case "ALREADY_IN_USE":
                                g.onError(b.ErrorCode.ALREADY_IN_USE);
                                break;
                            case "INVALID_CHANNEL_NAME":
                                g.onError(b.ErrorCode.INVALID_CHANNEL_NAME);
                                break
                            }
                        }
                    })
                },
                onError: function(h) {
                    g.onError(h)
                }
            })
        };
        c.prototype.changeMediaType = function(f, e, d, j) {
            var h = this,
            g = h._memorySessions["chnl_" + e],
            i = new b.MediaModifyMessage({
                callId: g.Id,
                mediaType: b.VoIPMediaType.MEDIA_AUDIO
            });
            if (d == b.VoIPMediaType.MEDIA_VEDIO) {
                h.sendMessage(f, e, i);
                if (!h._memorySessions.localStream.videoEnabled) {
                    h._memorySessions.localStream.videoEnabled = true;
                    h._memorySessions.localStream.close();
                    h.closeRemoteStream();
                    j.onSuccess()
                }
            } else {
                if (d == b.VoIPMediaType.MEDIA_AUDIO) {
                    if (!h._memorySessions.localStream.audioEnabled) {
                        h._memorySessions.localStream.audioEnabled = true;
                        h._memorySessions.client.disableAudio(h._memorySessions.localStream,
                        function() {
                            j.onSuccess()
                        })
                    } else {
                        h._memorySessions.localStream.audioEnabled = false;
                        h._memorySessions.client.enableAudio(h._memorySessions.localStream,
                        function() {
                            j.onSuccess()
                        })
                    }
                }
            }
        };
        c.prototype.mute = function(f) {
            var e = this._memorySessions,
            d = e.localStream;
            d.audioEnabled = false;
            e.client.disableAudio(d,
            function() {
                f()
            })
        };
        c.prototype.unmute = function(f) {
            var e = this._memorySessions,
            d = e.localStream;
            d.audioEnabled = true;
            e.client.enableAudio(d,
            function() {
                f()
            })
        };
        c.prototype.audioToVideo = function(g, d, f) {
            var e = {
                conversationType: g,
                targetId: d,
                type: b.VoIPMediaType.MEDIA_VEDIO,
                disable: false,
                method: "enableVideo",
                callback: f
            };
            this.switchMedia(e)
        };
        c.prototype.videoToAudio = function(g, d, f) {
            var e = {
                conversationType: g,
                targetId: d,
                type: b.VoIPMediaType.MEDIA_AUDIO,
                disable: true,
                method: "disableViode",
                callback: f
            };
            this.switchMedia(e)
        };
        c.prototype.switchMedia = function(h) {
            var g = this._memorySessions["chnl_" + h.targetId],
            j = new b.MediaModifyMessage({
                callId: g.Id,
                mediaType: h.type
            });
            var f = this;
            f.sendMessage(h.conversationType, h.targetId, j);
            var d = f._memorySessions.client,
            i = f._memorySessions.localStream;
            var e = {
                disableVideo: function() {
                    i.videoEnabled = true;
                    i.close();
                    f.closeRemoteStream()
                },
                enableVideo: function() {
                    f.initLocalStream(f._memorySessions.uid, h.type)
                }
            };
            e[h.method]()
        };
        c.prototype.getSummaryMessage = function(g) {
            var f = this,
            e = this._memorySessions.startVoIPTime,
            h = e == 0 ? 0 : +new Date - e;
            f._memorySessions.startVoIPTime = 0;
            var d = g.content;
            return new b.SummaryMessage({
                caller: b.Bridge._client.userId,
                inviter: g.targetId,
                mediaType: f._memorySessions.mediaType,
                startTime: e,
                duration: Math.floor(h / 1000),
                status: d.reason
            })
        };
        c.prototype.closeRemoteStream = function(h) {
            var g = this;
            var f = g._memorySessions.container.local;
            var i = g._memorySessions.container.remote;
            if (h) {
                h.close();
                f.removeChild(f)
            } else {
                var d = g._memorySessions.remoteStreamList;
                for (var e in d) {
                    d[e].close();
                    f.removeChild(i);
                    delete g._memorySessions.remoteStreamList[e]
                }
            }
        };
        c.prototype.isEmptyObject = function() {
            var f = true,
            e = this;
            for (var d in e._memorySessions.remoteStreamList) {
                f = false;
                break
            }
            return f
        };
        c.prototype.initLocalStream = function(g, d) {
            var f = this,
            e = f.generateVideoProfile();
            if (f._memorySessions.localStream) {
                f._memorySessions.client.unpublish(f._memorySessions.localStream,
                function(h) {
                    console.log("Unpublish failed with error: ", h)
                });
                f._memorySessions.localStream.close()
            }
            f._memorySessions.localStream = AgoraRTC.createStream({
                streamID: g,
                local: true
            });
            if (d == b.VoIPMediaType.MEDIA_AUDIO) {
                f._memorySessions.client.disableVideo(f._memorySessions.localStream);
                f._memorySessions.client.enableAudio(f._memorySessions.localStream);
                f._memorySessions.localStream.audioEnabled = false;
                f._memorySessions.localStream.videoEnabled = true
            } else {
                f._memorySessions.localStream.audioEnabled = false;
                f._memorySessions.localStream.videoEnabled = false;
                f._memorySessions.localStream.setVideoProfile(e);
                f._memorySessions.localStream.init(function() {
                    var h = f._memorySessions.videoSize;
                    f.displayStream();
                    f._memorySessions.client.publish(f._memorySessions.localStream,
                    function(i) {});
                    f._memorySessions.client.on("stream-published")
                },
                function(h) {
                    console.log("Local stream init failed.", h)
                })
            }
        };
        c.prototype.displayStream = function(g) {
            var e = this;
            var f = e._memorySessions;
            var d = f.container.local;
            if (!g) {
                f.localStream.play(d.id)
            } else {
                var h = f.getChildNode(d.id, g.getId());
                f.container.remote = h;
                console.log(g.getId());
                d.appendChild(h);
                g.play(h.id,
                function(i) {
                    throw new Error(i)
                })
            }
        };
        c.prototype.generateVideoProfile = function() {
            var d = "480P_2",
            e = this;
            switch (e._memorySessions.resolution) {
            case "120p":
                d = "120P";
                break;
            case "240p":
                d = "240P";
                break;
            case "360p":
                d = "360P";
                break;
            case "480p":
                if (e._memorySessions.maxFrameRate === 15) {
                    d = "480P"
                } else {
                    d = "480P_2"
                }
                break;
            case "720p":
                if (e._memorySessions.maxFrameRate === 15) {
                    d = "720P"
                } else {
                    d = "720P_2"
                }
                break;
            case "1080p":
                if (e._memorySessions.maxFrameRate === 15) {
                    d = "1080P"
                } else {
                    d = "1080P_2"
                }
                break;
            default:
                break
            }
            return d
        };
        c.prototype.onReceived = function(l) {
            var f = this,
            k = f._memorySessions["chnl_" + l.targetId];
            switch (l.messageType) {
            case b.RongIMClient.MessageType.InviteMessage:
                var i = l.content;
                if (f._memorySessions.isActiveCall) {
                    var d = new b.HungupMessage({
                        callId: i.callId,
                        reason: b.ErrorCode.REMOTE_BUSYLINE
                    });
                    f.sendMessage(l.conversationType, l.targetId, d);
                    return
                }
                f._memorySessions.message = l;
                f._memorySessions["chnl_" + l.targetId] = {
                    Id: i.callId,
                    Key: ""
                };
                var e = new b.RingingMessage({
                    callId: i.callId
                });
                f.sendMessage(l.conversationType, l.targetId, e);
                var h = l.content;
                f._memorySessions.mediaType = h.mediaType;
                b.Channel._ReceiveMessageListener.onReceived(l);
                break;
            case b.RongIMClient.MessageType.RingingMessage:
                b.Channel._ReceiveMessageListener.onReceived(l);
                break;
            case b.RongIMClient.MessageType.AcceptMessage:
                if (!k) {
                    return
                }
                clearTimeout(f._memorySessions.timer);
                var g = l.content;
                f._memorySessions.mediaType = g.mediaType;
                f._memorySessions.client.init(k.Key,
                function(m) {
                    f._memorySessions.client.join(k.Key, k.Id, f._memorySessions.sentTime & 2147483647,
                    function(n) {
                        f._memorySessions.startVoIPTime = +new Date;
                        f._memorySessions.isActiveCall = true;
                        f.initLocalStream(n, g.mediaType)
                    })
                },
                function(m) {
                    if (m) {
                        switch (m.reason) {
                        case "CLOSE_BEFORE_OPEN":
                            f._memorySessions.startCallback.onError(b.ErrorCode.CLOSE_BEFORE_OPEN);
                            break;
                        case "ALREADY_IN_USE":
                            f._memorySessions.startCallback.onError(b.ErrorCode.ALREADY_IN_USE);
                            break;
                        case "INVALID_CHANNEL_NAME":
                            f._memorySessions.startCallback.onError(b.ErrorCode.INVALID_CHANNEL_NAME);
                            break
                        }
                    }
                });
                b.Channel._ReceiveMessageListener.onReceived(l);
                break;
            case b.RongIMClient.MessageType.HungupMessage:
                clearTimeout(f._memorySessions.timer);
                if (!f.isEmptyObject()) {
                    f._memorySessions.client.leave();
                    f._memorySessions.client.close();
                    f.closeRemoteStream()
                }
                l.messageType = "SummaryMessage";
                l.content = f.getSummaryMessage(l);
                f._memorySessions.isActiveCall = false;
                b.Channel._ReceiveMessageListener.onReceived(l);
                break;
            case b.RongIMClient.MessageType.MediaModifyMessage:
                var j = l.content;
                if (j.mediaType == b.VoIPMediaType.MEDIA_AUDIO) {
                    f._memorySessions.localStream.close();
                    f.closeRemoteStream()
                }
                b.Channel._ReceiveMessageListener.onReceived(l);
                break;
            case b.RongIMClient.MessageType.MemberModifyMessage:
                b.Channel._ReceiveMessageListener.onReceived(l);
                break
            }
            return true
        };
        c.prototype.sendMessage = function(e, d, f, g) {
            c._rongIMClient.sendMessage(e, d, f, {
                onSuccess: function(h) {
                    if (g) {
                        g.onSuccess(h)
                    }
                },
                onError: function(h) {
                    if (g) {
                        g.onError(h)
                    }
                },
                onBefore: function() {}
            })
        };
        c._instance = null;
        return c
    } ());
    b.RongCallLib = a
})(RongIMLib || (RongIMLib = {}));