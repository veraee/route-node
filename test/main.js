'use strict';

var path      = require('path');
var pkg       = require('../package.json');
var RouteNode = require(path.join(__dirname, '..', pkg.main));
var should    = require('should');
var omit      = require('lodash.omit');

function withoutMeta(obj) {
    return omit(obj, '_meta');
}

require('mocha');

describe('RouteNode', function () {
    it('should instanciate an empty RouteNode if no routes are specified in constructor', function () {
        var node = new RouteNode();

        node.children.length.should.equal(0);
    });

    it('should throw an error when RouteNode is not used as a constructor', function () {
        (function () {
            RouteNode('', '', [
                {name: 'home'}
            ]);
        }).should.throw();
    });

    it('should instanciate a RouteNode object from plain objects', function () {
        var node = new RouteNode('', '', [
            {name: 'home', path: '/home'},
            {name: 'profile', path: '/profile'}
        ]);

        node.children.length.should.equal(2);
    });

    it('should callback for each route from a POJO', function () {
        var routeA = {name: 'home', path: '/home', extra: 'extra'};
        var routeB = {name: 'profile', path: '/profile', extra: 'extra'};

        var routes = [routeA, routeB];
        var node = new RouteNode();
        var i = 0;

        node.add(routes, function(route) {
            i = i + 1;
            if (i === 1) route.should.equal(routeA);
            if (i === 2) route.should.equal(routeB);
        });

        i.should.not.equal(0);

        i = 0;

        var node = new RouteNode('', '', routes, function(route) {
            i = i + 1;
            if (i === 1) route.should.equal(routeA);
            if (i === 2) route.should.equal(routeB);
        });

        i.should.not.equal(0);
    });

    it('should throw an error when trying to instanciate a RouteNode object with plain objects missing `name` or `path` properties', function () {
        (function () {
            new RouteNode('', '', [
                {name: 'home'}
            ]);
        }).should.throw();

        (function () {
            new RouteNode('', '', [
                {path: '/profile'}
            ]);
        }).should.throw();
    });

    it('should throw an error when trying to add a node which is not an instance of RouteNode or Object', function () {
        var rootNode = new RouteNode('', '');

        (function () {
            rootNode.add('users');
        }).should.throw();
    });

    it('should throw an error when trying to add a route to a node with an already existing alias or path', function () {
        var root = new RouteNode('', '', [
            {name: 'home', path: '/home'}
        ]);

        (function () {
            root.add({name: 'home', path: '/profile'})
        }).should.throw('Alias "home" is already defined in route node');

        (function () {
            root.add({name: 'profile', path: '/home'})
        }).should.throw('Path "/home" is already defined in route node');
    });

    it('should throw an error when trying to add a route which parent doesn\'t exist', function () {
        var root = new RouteNode('', '', [
            {name: 'home', path: '/home'}
        ]);

        (function () {
            root.add({name: 'nested.route', path: '/route'})
        }).should.throw();
    });

    it('should instanciate a RouteNode object from RouteNode objects', function () {
        var node = new RouteNode('', '', [
            new RouteNode('home', '/home'),
            new RouteNode('profile', '/profile')
        ]);

        node.children.length.should.equal(2);
    });

    it('should find a nested route by name', function () {
        var node = getRoutes();

        node.getPath('home').should.equal('/home');
        node.getPath('users').should.equal('/users');
        node.getPath('users.list').should.equal('/users/list');
        node.getPath('users.view').should.equal('/users/view/:id');
    });

    it('should find a nested route by name', function () {
        var node = getRoutes();

        should.not.exists(node.getPath('users.manage'));
    });

    it('should build the path of a nested route', function () {
        var node = getRoutes();
        // Building paths
        node.buildPath('home').should.equal('/home');
        node.buildPath('users').should.equal('/users');
        node.buildPath('users.list').should.equal('/users/list');
        node.buildPath('users.view', {id: 1}).should.equal('/users/view/1');
        // Missing parameters
        (function () {
            node.buildPath('users.view');
        }).should.throw();
    });

    it('should build the state object of a nested route', function () {
        var node = getRoutes();
        // Building paths
        node.buildState('home').should.eql({
            _meta: { home: {} },
            name: 'home',
            params: {}
        });

        node.buildState('users.view', {id: 1}).should.eql({
            _meta: {
                users: {},
                'users.view': {
                    id: 'url'
                }
            },
            name: 'users.view',
            params: {id: 1}
        });
    });

    it('should find a nested route by matching a path', function () {
        var node = getRoutes();
        // Building paths
        withoutMeta(node.matchPath('/users')).should.eql({name: 'users', params: {}});

        node.matchPath('/users/view/1').should.eql({
            _meta: {
                users: {},
                'users.view': {
                    id: 'url'
                }
            },
            name: 'users.view',
            params: {id: '1'}
        });

        should.not.exists(node.matchPath('/users/profile/1'));
        should.not.exists(node.matchPath('/users/view/profile/1'));
    });

    it('should match build build paths with nested query parameters', function () {
        var node = new RouteNode('', '', [
            new RouteNode('grandParent', '/grand-parent?nickname', [
                new RouteNode('parent', '/parent?name', [
                    new RouteNode('child', '/child?age')
                ])
            ])
        ]);

        // Building
        node.buildPath('grandParent', {nickname: 'gran'}).should.equal('/grand-parent?nickname=gran');
        node.buildPath('grandParent.parent', {nickname: 'gran gran', name: 'maman'}).should.equal('/grand-parent/parent?nickname=gran%20gran&name=maman');
        node.buildPath('grandParent.parent', {nickname: 'gran'}).should.equal('/grand-parent/parent?nickname=gran');
        node.buildPath('grandParent.parent', {name: 'maman'}).should.equal('/grand-parent/parent?name=maman');
        node.buildPath('grandParent.parent.child', {name: 'maman', age: 3}).should.equal('/grand-parent/parent/child?name=maman&age=3');
        node.buildPath('grandParent.parent.child', {}).should.equal('/grand-parent/parent/child');
        node.buildPath('grandParent.parent.child', {nickname: ['gran', 'granny']}).should.equal('/grand-parent/parent/child?nickname=gran&nickname=granny');

        // Matching
        withoutMeta(node.matchPath('/grand-parent')).should.eql({name: 'grandParent', params: {}});

        node.matchPath('/grand-parent?nickname=gran').should.eql({
            _meta: {
                grandParent: {
                    nickname: 'query'
                }
            },
            name: 'grandParent',
            params: {nickname: 'gran'}
        });

        withoutMeta(node.matchPath('/grand-parent/parent?nickname=gran&name=maman%20man')).should.eql({name: 'grandParent.parent', params: {nickname: 'gran', name: 'maman man'}});
        withoutMeta(node.matchPath('/grand-parent/parent/child?nickname=gran&name=maman')).should.eql({name: 'grandParent.parent.child', params: {nickname: 'gran', name: 'maman'}});
        withoutMeta(node.matchPath('/grand-parent/parent/child?nickname=gran&name=maman&age=3')).should.eql({name: 'grandParent.parent.child', params: {nickname: 'gran', name: 'maman', age: '3'}});
        withoutMeta(node.matchPath('/grand-parent/parent/child?nickname=gran&nickname=granny&name=maman&age=3')).should.eql({name: 'grandParent.parent.child', params: {nickname: ['gran', 'granny'], name: 'maman', age: '3'}});

        // still matching remainingPath only consist of unknown qsParams
        node.matchPath('/grand-parent?nickname=gran&name=papa', { strictQueryParams: false }).should.eql({
          _meta: {
              grandParent: {
                  nickname: 'query'
              }
          },
          name: 'grandParent',
          params: {nickname: 'gran'}
        });
        node.matchPath('/grand-parent/parent/child?nickname=gran&names=papa-maman', { strictQueryParams: false }).should.eql({
          _meta: {
              grandParent: {
                  nickname: 'query'
              },
              'grandParent.parent': {
                  name: 'query'
              },
              'grandParent.parent.child': {
                  age: 'query'
              }
          },
          name: 'grandParent.parent.child',
          params: {nickname: 'gran'}
        });
    });

    it('should find a nested route by matching a path with a splat', function () {
        var node = getRoutesWithSplat();
        // Building paths
        withoutMeta(node.matchPath('/users/view/1')).should.eql({name: 'users.view', params: {id: '1'}});
        withoutMeta(node.matchPath('/users/profile/1')).should.eql({name: 'users.splat', params: {id: 'profile/1'}});
        should.not.exists(node.matchPath('/users/view/profile/1'));
    });

    it('should work on a tree without a root node', function () {
        var usersNode = new RouteNode('users', '/users', [
            new RouteNode('list', '/list'),
            new RouteNode('view', '/view/:id')
        ]);

        withoutMeta(usersNode.matchPath('/users/view/1')).should.eql({name: 'users.view', params: {id: '1'}});
        withoutMeta(usersNode.matchPath('/users/list')).should.eql({name: 'users.list', params: {}});
    })

    it('should be able to add deep nodes', function () {
        var rootNode = new RouteNode('', '')
            .addNode('users', '/users')
            .addNode('users.view', '/view/:id')
            .addNode('users.list', '/list');

        rootNode.buildPath('users.view', {id: 1}).should.equal('/users/view/1');
        rootNode.buildPath('users.list', {id: 1}).should.equal('/users/list');
    });

    it('should sort paths by length', function () {
        var rootNode = new RouteNode('', '')
            .addNode('section', '/section/:id?a')
            .addNode('index', '/?queryparamOfexceptionalLength')
            .addNode('id', '/:id?rrrr')
            .addNode('abo', '/abo')
            .addNode('about', '/about?hello');

        withoutMeta(rootNode.matchPath('/')).should.eql({name: 'index', params: {}});
        withoutMeta(rootNode.matchPath('/abo')).should.eql({name: 'abo', params: {}});
        withoutMeta(rootNode.matchPath('/about')).should.eql({name: 'about', params: {}});
        withoutMeta(rootNode.matchPath('/abc')).should.eql({name: 'id', params: {id: 'abc'}});
        withoutMeta(rootNode.matchPath('/section/abc')).should.eql({name: 'section', params: {id: 'abc'}});
    });

    it('should match paths with optional trailing slashes', function () {
        var rootNode = getRoutes();
        should.not.exists(rootNode.matchPath('/users/list/'));
        withoutMeta(rootNode.matchPath('/users/list', { trailingSlash: true })).should.eql({name: 'users.list', params: {}});
        withoutMeta(rootNode.matchPath('/users/list')).should.eql({name: 'users.list', params: {}});
        withoutMeta(rootNode.matchPath('/users/list/', { trailingSlash: true })).should.eql({name: 'users.list', params: {}});
        should.not.exists(rootNode.matchPath('/users/list//', { trailingSlash: true }));

        var rootNode = getRoutes(true);
        should.not.exists(rootNode.matchPath('/users/list'));
        withoutMeta(rootNode.matchPath('/users/list', { trailingSlash: true })).should.eql({name: 'users.list', params: {}});
        withoutMeta(rootNode.matchPath('/users/list/', { trailingSlash: true })).should.eql({name: 'users.list', params: {}});
        withoutMeta(rootNode.matchPath('/users/list/')).should.eql({name: 'users.list', params: {}});
        withoutMeta(rootNode.matchPath('/')).should.eql({name: 'default', params: {}});
        withoutMeta(rootNode.matchPath('', { trailingSlash: true })).should.eql({name: 'default', params: {}});
        should.not.exists(rootNode.matchPath('/users/list//', { trailingSlash: true }));
    });

    it('should support query parameters with square brackets', function () {
        var node = new RouteNode('', '', [
            new RouteNode('route', '/route?arr[]', [
                new RouteNode('deep', '/deep?arr2[]')
            ])
        ]);

        // node.buildPath('route.deep', { arr: [1, 2], arr2: [3] }).should.equal('/route/deep?arr[]=1&arr[]=2&arr2[]=3');
        withoutMeta(node.matchPath('/route/deep?arr[]=1&arr[]=2&arr2[]=3')).should.eql({
            name: 'route.deep',
            params: { arr: ['1', '2'], arr2: ['3'] }
        });
    });

    it('should support query parameters in the root node', function () {
        var node = new RouteNode('', '?a', [
            new RouteNode('route', '/path?b')
        ]);
        withoutMeta(node.matchPath('/path?a=1&b=2')).should.eql({
            name: 'route',
            params: { a: '1', b: '2' }
        });
    });
});


function getRoutes(trailingSlash) {
    var suffix = trailingSlash ? '/' : '';
    var usersNode = new RouteNode('users', '/users', [
        new RouteNode('list', '/list' + suffix),
        new RouteNode('view', '/view/:id' + suffix)
    ]);

    return new RouteNode('', '', [
        new RouteNode('home', '/home' + suffix),
        new RouteNode('default', '/'),
        usersNode
    ]);
}

function getRoutesWithSplat() {
    var usersNode = new RouteNode('users', '/users', [
        new RouteNode('splat', '/*id'),
        new RouteNode('view', '/view/:id'),
        new RouteNode('list', '/list')
    ]);

    return new RouteNode('', '', [
        usersNode
    ]);
}
