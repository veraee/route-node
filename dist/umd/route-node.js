(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define('RouteNode', factory) :
    (global.RouteNode = factory());
}(this, function () { 'use strict';

    var babelHelpers = {};

    function babelHelpers_typeof (obj) {
      return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    function babelHelpers_classCallCheck (instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    };

    var babelHelpers_createClass = (function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    })();

    var babelHelpers_extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    var defaultOrConstrained = function defaultOrConstrained(match) {
        return '(' + (match ? match.replace(/(^<|>$)/g, '') : '[a-zA-Z0-9-_.~]+') + ')';
    };

    var rules = [{
        // An URL can contain a parameter :paramName
        // - and _ are allowed but not in last position
        name: 'url-parameter',
        pattern: /^:([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
        regex: function regex(match) {
            return new RegExp(defaultOrConstrained(match[2]));
        }
    }, {
        // Url parameter (splat)
        name: 'url-parameter-splat',
        pattern: /^\*([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/,
        regex: /([^\?]*)/
    }, {
        name: 'url-parameter-matrix',
        pattern: /^\;([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
        regex: function regex(match) {
            return new RegExp(';' + match[1] + '=' + defaultOrConstrained(match[2]));
        }
    }, {
        // Query parameter: ?param1&param2
        //                   ?:param1&:param2
        name: 'query-parameter-bracket',
        pattern: /^(?:\?|&)(?:\:)?([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(?:\[\])/
    }, // regex:   match => new RegExp('(?=(\?|.*&)' + match[0] + '(?=(\=|&|$)))')
    {
        // Query parameter: ?param1&param2
        //                   ?:param1&:param2
        name: 'query-parameter',
        pattern: /^(?:\?|&)(?:\:)?([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/
    }, // regex:   match => new RegExp('(?=(\?|.*&)' + match[0] + '(?=(\=|&|$)))')
    {
        // Delimiter /
        name: 'delimiter',
        pattern: /^(\/|\?)/,
        regex: function regex(match) {
            return new RegExp('\\' + match[0]);
        }
    }, {
        // Sub delimiters
        name: 'sub-delimiter',
        pattern: /^(\!|\&|\-|_|\.|;)/,
        regex: function regex(match) {
            return new RegExp(match[0]);
        }
    }, {
        // Unmatched fragment (until delimiter is found)
        name: 'fragment',
        pattern: /^([0-9a-zA-Z]+)/,
        regex: function regex(match) {
            return new RegExp(match[0]);
        }
    }];

    var tokenise = function tokenise(str) {
        var tokens = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

        // Look for a matching rule
        var matched = rules.some(function (rule) {
            var match = str.match(rule.pattern);
            if (!match) return false;

            tokens.push({
                type: rule.name,
                match: match[0],
                val: match.slice(1, 2),
                otherVal: match.slice(2),
                regex: rule.regex instanceof Function ? rule.regex(match) : rule.regex
            });

            if (match[0].length < str.length) tokens = tokenise(str.substr(match[0].length), tokens);
            return true;
        });

        // If no rules matched, throw an error (possible malformed path)
        if (!matched) {
            throw new Error('Could not parse path.');
        }
        // Return tokens
        return tokens;
    };

    var optTrailingSlash = function optTrailingSlash(source, trailingSlash) {
        if (!trailingSlash) return source;
        return source.replace(/\\\/$/, '') + '(?:\\/)?';
    };

    var withoutBrackets$1 = function withoutBrackets(param) {
        return param.replace(/\[\]$/, '');
    };

    var appendQueryParam = function appendQueryParam(params, param) {
        var val = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];

        if (/\[\]$/.test(param)) {
            param = withoutBrackets$1(param);
            val = [val];
        }
        var existingVal = params[param];

        if (existingVal === undefined) params[param] = val;else params[param] = Array.isArray(existingVal) ? existingVal.concat(val) : [existingVal, val];

        return params;
    };

    var parseQueryParams = function parseQueryParams(path) {
        var searchPart = path.split('?')[1];
        if (!searchPart) return {};

        return searchPart.split('&').map(function (_) {
            return _.split('=');
        }).reduce(function (obj, m) {
            return appendQueryParam(obj, m[0], m[1] ? decodeURIComponent(m[1]) : m[1]);
        }, {});
    };

    var toSerialisable = function toSerialisable(val) {
        return val !== undefined && val !== null && val !== '' ? '=' + encodeURIComponent(val) : '';
    };

    var _serialise = function _serialise(key, val) {
        return Array.isArray(val) ? val.map(function (v) {
            return _serialise(key, v);
        }).join('&') : key + toSerialisable(val);
    };

    var Path = (function () {
        babelHelpers_createClass(Path, null, [{
            key: 'createPath',
            value: function createPath(path) {
                return new Path(path);
            }
        }, {
            key: 'serialise',
            value: function serialise(key, val) {
                return _serialise(key, val);
            }
        }]);

        function Path(path) {
            babelHelpers_classCallCheck(this, Path);

            if (!path) throw new Error('Please supply a path');
            this.path = path;
            this.tokens = tokenise(path);

            this.hasUrlParams = this.tokens.filter(function (t) {
                return (/^url-parameter/.test(t.type)
                );
            }).length > 0;
            this.hasSpatParam = this.tokens.filter(function (t) {
                return (/splat$/.test(t.type)
                );
            }).length > 0;
            this.hasMatrixParams = this.tokens.filter(function (t) {
                return (/matrix$/.test(t.type)
                );
            }).length > 0;
            this.hasQueryParams = this.tokens.filter(function (t) {
                return (/^query-parameter/.test(t.type)
                );
            }).length > 0;
            // Extract named parameters from tokens
            this.urlParams = !this.hasUrlParams ? [] : this.tokens.filter(function (t) {
                return (/^url-parameter/.test(t.type)
                );
            }).map(function (t) {
                return t.val.slice(0, 1);
            })
            // Flatten
            .reduce(function (r, v) {
                return r.concat(v);
            });
            // Query params
            this.queryParams = !this.hasQueryParams ? [] : this.tokens.filter(function (t) {
                return t.type === 'query-parameter';
            }).map(function (t) {
                return t.val;
            }).reduce(function (r, v) {
                return r.concat(v);
            }, []);

            this.queryParamsBr = !this.hasQueryParams ? [] : this.tokens.filter(function (t) {
                return (/-bracket$/.test(t.type)
                );
            }).map(function (t) {
                return t.val;
            }).reduce(function (r, v) {
                return r.concat(v);
            }, []);

            this.params = this.urlParams.concat(this.queryParams).concat(this.queryParamsBr);
            // Check if hasQueryParams
            // Regular expressions for url part only (full and partial match)
            this.source = this.tokens.filter(function (t) {
                return t.regex !== undefined;
            }).map(function (r) {
                return r.regex.source;
            }).join('');
        }

        babelHelpers_createClass(Path, [{
            key: '_urlMatch',
            value: function _urlMatch(path, regex) {
                var _this = this;

                var match = path.match(regex);
                if (!match) return null;else if (!this.urlParams.length) return {};
                // Reduce named params to key-value pairs
                return match.slice(1, this.urlParams.length + 1).reduce(function (params, m, i) {
                    params[_this.urlParams[i]] = m;
                    return params;
                }, {});
            }
        }, {
            key: 'match',
            value: function match(path) {
                var _this2 = this;

                var trailingSlash = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

                // trailingSlash: falsy => non optional, truthy => optional
                var source = optTrailingSlash(this.source, trailingSlash);
                // Check if exact match
                var matched = this._urlMatch(path, new RegExp('^' + source + (this.hasQueryParams ? '\\?.*$' : '$')));

                // If no match, or no query params, no need to go further
                if (!matched || !this.hasQueryParams) return matched;
                // Extract query params
                var queryParams = parseQueryParams(path);
                var unexpectedQueryParams = Object.keys(queryParams).filter(function (p) {
                    return _this2.queryParams.concat(_this2.queryParamsBr).indexOf(p) === -1;
                });

                if (unexpectedQueryParams.length === 0) {
                    // Extend url match
                    Object.keys(queryParams).forEach(function (p) {
                        return matched[p] = queryParams[p];
                    });

                    return matched;
                }

                return null;
            }
        }, {
            key: 'partialMatch',
            value: function partialMatch(path) {
                var _this3 = this;

                var trailingSlash = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

                // Check if partial match (start of given path matches regex)
                // trailingSlash: falsy => non optional, truthy => optional
                var source = optTrailingSlash(this.source, trailingSlash);
                var match = this._urlMatch(path, new RegExp('^' + source));

                if (!match) return match;

                if (!this.hasQueryParams) return match;

                var queryParams = parseQueryParams(path);

                Object.keys(queryParams).filter(function (p) {
                    return _this3.queryParams.concat(_this3.queryParamsBr).indexOf(p) >= 0;
                }).forEach(function (p) {
                    return appendQueryParam(match, p, queryParams[p]);
                });

                return match;
            }
        }, {
            key: 'build',
            value: function build() {
                var params = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
                var opts = arguments.length <= 1 || arguments[1] === undefined ? { ignoreConstraints: false, ignoreSearch: false } : arguments[1];

                // Check all params are provided (not search parameters which are optional)
                if (this.urlParams.some(function (p) {
                    return params[p] === undefined;
                })) throw new Error('Missing parameters');

                // Check constraints
                if (!opts.ignoreConstraints) {
                    var constraintsPassed = this.tokens.filter(function (t) {
                        return (/^url-parameter/.test(t.type) && !/-splat$/.test(t.type)
                        );
                    }).every(function (t) {
                        return new RegExp('^' + defaultOrConstrained(t.otherVal[0]) + '$').test(params[t.val]);
                    });

                    if (!constraintsPassed) throw new Error('Some parameters are of invalid format');
                }

                var base = this.tokens.filter(function (t) {
                    return (/^query-parameter/.test(t.type) === false
                    );
                }).map(function (t) {
                    if (t.type === 'url-parameter-matrix') return ';' + t.val + '=' + params[t.val[0]];
                    return (/^url-parameter/.test(t.type) ? params[t.val[0]] : t.match
                    );
                }).join('');

                if (opts.ignoreSearch) return base;

                var queryParams = this.queryParams.concat(this.queryParamsBr.map(function (p) {
                    return p + '[]';
                }));

                var searchPart = queryParams.filter(function (p) {
                    return Object.keys(params).indexOf(withoutBrackets$1(p)) !== -1;
                }).map(function (p) {
                    return _serialise(p, params[withoutBrackets$1(p)]);
                }).join('&');

                return base + (searchPart ? '?' + searchPart : '');
            }
        }]);
        return Path;
    })();

    var isSerialisable = function isSerialisable(val) {
        return val !== undefined && val !== null && val !== '';
    };

    var bracketTest = /\[\]$/;
    var withoutBrackets = function withoutBrackets(param) {
        return param.replace(bracketTest, '');
    };

    var removeQueryParamsFromPath = function removeQueryParamsFromPath(path, params) {
        if (path.indexOf('?') === -1) return path;
        var splitPath = path.split('?');
        var pathPart = splitPath[0];
        var searchPart = splitPath[1];

        var remainingSearchParams = searchPart.split('&').reduce(function (obj, p) {
            var splitParam = p.split('=');
            var hasBrackets = bracketTest.test(splitParam[0]);
            var key = splitParam[0];
            var val = decodeURIComponent(splitParam[1]);
            val = hasBrackets ? [val] : val;

            if (params.indexOf(withoutBrackets(key)) === -1) obj[key] = val || '';
            return obj;
        }, {});

        var remainingSearchPart = Object.keys(remainingSearchParams).map(function (p) {
            return [p].concat(isSerialisable(remainingSearchParams[p]) ? encodeURIComponent(remainingSearchParams[p]) : []);
        }).map(function (p) {
            return p.join('=');
        }).join('&');

        return pathPart + (remainingSearchPart ? '?' + remainingSearchPart : '');
    };

    var RouteNode = (function () {
        function RouteNode() {
            var name = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
            var path = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
            var childRoutes = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
            babelHelpers_classCallCheck(this, RouteNode);

            this.name = name;
            this.path = path;
            this.parser = path ? new Path(path) : null;
            this.children = [];

            this.add(childRoutes);

            return this;
        }

        babelHelpers_createClass(RouteNode, [{
            key: 'add',
            value: function add(route) {
                var _this = this;

                if (route === undefined || route === null) return;

                if (route instanceof Array) {
                    route.forEach(function (r) {
                        return _this.add(r);
                    });
                    return;
                }

                if (!(route instanceof RouteNode) && !(route instanceof Object)) {
                    throw new Error('RouteNode.add() expects routes to be an Object or an instance of RouteNode.');
                }
                if (route instanceof Object) {
                    if (!route.name || !route.path) {
                        throw new Error('RouteNode.add() expects routes to have a name and a path defined.');
                    }
                    route = new RouteNode(route.name, route.path, route.children);
                }
                // Check duplicated routes
                if (this.children.map(function (child) {
                    return child.name;
                }).indexOf(route.name) !== -1) {
                    throw new Error('Alias "' + route.name + '" is already defined in route node');
                }
                // Check duplicated paths
                if (this.children.map(function (child) {
                    return child.path;
                }).indexOf(route.path) !== -1) {
                    throw new Error('Path "' + route.path + '" is already defined in route node');
                }

                var names = route.name.split('.');

                if (names.length === 1) {
                    this.children.push(route);
                    // Push greedy spats to the bottom of the pile
                    this.children.sort(function (a, b) {
                        // '/' last
                        if (a.path === '/') return 1;
                        if (b.path === '/') return -1;
                        var aHasParams = a.parser.hasUrlParams || a.parser.hasSpatParam;
                        var bHasParams = b.parser.hasUrlParams || b.parser.hasSpatParam;
                        // No params first, sort by length descending
                        if (!aHasParams && !bHasParams) {
                            return a.path && b.path ? a.path.length < b.path.length ? 1 : -1 : 0;
                        }
                        // Params last
                        if (aHasParams && !bHasParams) return 1;
                        if (!aHasParams && bHasParams) return -1;
                        // Spat params last
                        if (!a.parser.hasSpatParam && b.parser.hasSpatParam) return -1;
                        if (!b.parser.hasSpatParam && a.parser.hasSpatParam) return 1;
                        // Sort by number of segments descending
                        var aSegments = (a.path.match(/\//g) || []).length;
                        var bSegments = (b.path.match(/\//g) || []).length;
                        if (aSegments < bSegments) return 1;
                        return 0;
                    });
                } else {
                    // Locate parent node
                    var segments = this.getSegmentsByName(names.slice(0, -1).join('.'));
                    if (segments) {
                        segments[segments.length - 1].add(new RouteNode(names[names.length - 1], route.path, route.children));
                    } else {
                        throw new Error('Could not add route named \'' + route.name + '\', parent is missing.');
                    }
                }

                return this;
            }
        }, {
            key: 'addNode',
            value: function addNode(name, params) {
                this.add(new RouteNode(name, params));
                return this;
            }
        }, {
            key: 'getSegmentsByName',
            value: function getSegmentsByName(routeName) {
                var findSegmentByName = function findSegmentByName(name, routes) {
                    var filteredRoutes = routes.filter(function (r) {
                        return r.name === name;
                    });
                    return filteredRoutes.length ? filteredRoutes[0] : undefined;
                };
                var segments = [];
                var names = routeName.split('.');
                var routes = this.children;

                var matched = names.every(function (name) {
                    var segment = findSegmentByName(name, routes);
                    if (segment) {
                        routes = segment.children;
                        segments.push(segment);
                        return true;
                    }
                    return false;
                });

                return matched ? segments : null;
            }
        }, {
            key: 'getSegmentsMatchingPath',
            value: function getSegmentsMatchingPath(path, options) {
                var trailingSlash = options.trailingSlash;
                var strictQueryParams = options.strictQueryParams;

                var matchChildren = function matchChildren(nodes, pathSegment, segments) {
                    var _loop = function _loop(i) {
                        var child = nodes[i];
                        // Partially match path
                        var match = child.parser.partialMatch(pathSegment);
                        var remainingPath = undefined;

                        if (!match && trailingSlash) {
                            // Try with optional trailing slash
                            match = child.parser.match(pathSegment, true);
                            remainingPath = '';
                        } else if (match) {
                            // Remove consumed segment from path
                            var consumedPath = child.parser.build(match, { ignoreSearch: true });
                            remainingPath = removeQueryParamsFromPath(pathSegment.replace(consumedPath, ''), child.parser.queryParams.concat(child.parser.queryParamsBr));

                            if (trailingSlash && remainingPath === '/' && !/\/$/.test(consumedPath)) {
                                remainingPath = '';
                            }
                        }

                        if (match) {
                            segments.push(child);
                            Object.keys(match).forEach(function (param) {
                                return segments.params[param] = match[param];
                            });

                            if (!remainingPath.length || // fully matched
                            !strictQueryParams && remainingPath.indexOf('?') === 0 // unmatched queryParams in non strict mode
                            ) {
                                    return {
                                        v: segments
                                    };
                                }
                            // If no children to match against but unmatched path left
                            if (!child.children.length) {
                                return {
                                    v: null
                                };
                            }
                            // Else: remaining path and children
                            return {
                                v: matchChildren(child.children, remainingPath, segments)
                            };
                        }
                    };

                    // for (child of node.children) {
                    for (var i in nodes) {
                        var _ret = _loop(i);

                        if ((typeof _ret === 'undefined' ? 'undefined' : babelHelpers_typeof(_ret)) === "object") return _ret.v;
                    }
                    return null;
                };

                var startingNodes = this.parser ? [this] : this.children;
                var segments = [];
                segments.params = {};

                return matchChildren(startingNodes, path, segments);
            }
        }, {
            key: 'getPathFromSegments',
            value: function getPathFromSegments(segments) {
                return segments ? segments.map(function (segment) {
                    return segment.path;
                }).join('') : null;
            }
        }, {
            key: 'getPath',
            value: function getPath(routeName) {
                return this.getPathFromSegments(this.getSegmentsByName(routeName));
            }
        }, {
            key: 'buildPathFromSegments',
            value: function buildPathFromSegments(segments) {
                var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                if (!segments) return null;

                var searchParams = segments.filter(function (s) {
                    return s.parser.hasQueryParams;
                }).reduce(function (params, s) {
                    return params.concat(s.parser.queryParams).concat(s.parser.queryParamsBr.map(function (p) {
                        return p + '[]';
                    }));
                }, []);

                var searchPart = !searchParams.length ? null : searchParams.filter(function (p) {
                    return Object.keys(params).indexOf(withoutBrackets(p)) !== -1;
                }).map(function (p) {
                    return Path.serialise(p, params[withoutBrackets(p)]);
                }).join('&');

                return segments.map(function (segment) {
                    return segment.parser.build(params, { ignoreSearch: true });
                }).join('') + (searchPart ? '?' + searchPart : '');
            }
        }, {
            key: 'getMetaFromSegments',
            value: function getMetaFromSegments(segments) {
                var accName = '';

                return segments.reduce(function (meta, segment, i) {
                    var urlParams = segment.parser.urlParams.reduce(function (params, p) {
                        params[p] = 'url';
                        return params;
                    }, {});

                    var allParams = segment.parser.queryParams.reduce(function (params, p) {
                        params[p] = 'query';
                        return params;
                    }, urlParams);

                    accName = accName ? accName + '.' + segment.name : segment.name;
                    meta[accName] = allParams;
                    return meta;
                }, {});
            }
        }, {
            key: 'buildPath',
            value: function buildPath(routeName) {
                var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                return this.buildPathFromSegments(this.getSegmentsByName(routeName), params);
            }
        }, {
            key: 'buildStateFromSegments',
            value: function buildStateFromSegments(segments) {
                if (!segments || !segments.length) return null;

                var name = segments.map(function (segment) {
                    return segment.name;
                }).join('.');
                var params = segments.params;

                return {
                    name: name,
                    params: params,
                    _meta: this.getMetaFromSegments(segments)
                };
            }
        }, {
            key: 'buildState',
            value: function buildState(name) {
                var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

                var segments = this.getSegmentsByName(name);
                if (!segments || !segments.length) return null;

                return {
                    name: name,
                    params: params,
                    _meta: this.getMetaFromSegments(segments)
                };
            }
        }, {
            key: 'matchPath',
            value: function matchPath(path, options) {
                var defaultOptions = { trailingSlash: false, strictQueryParams: true };
                options = babelHelpers_extends({}, defaultOptions, options);
                return this.buildStateFromSegments(this.getSegmentsMatchingPath(path, options));
            }
        }]);
        return RouteNode;
    })();

    return RouteNode;

}));