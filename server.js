const express = require('express')
const Handlebars = require('handlebars')
const expressHandlebars = require('express-handlebars')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const data = require('./restaurants.json')
const {Restaurant, Menu, Item, db} = require('./models')
const app = express()


const handlebars = expressHandlebars({
    handlebars: allowInsecurePrototypeAccess(Handlebars)
})

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.engine('handlebars', handlebars)
app.set('view engine', 'handlebars')

// Get all restaurants
app.get('/', async(req, res) => {
    const restaurants = await Restaurant.findAll({
        include: [{model: Menu, as: 'menus'}],
        nest:true
    })
    res.render('home', {restaurants})
})

// Add a restaurant
app.post('/', async(req, res) => {
    await Restaurant.create(req.body)
    res.redirect('/')
})

// Get sepcific restaurant by id
app.get('/:restaurantId', async(req, res) => {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

// Delete restaurant by id
app.get('/:restaurantId/delete', async(req, res) => {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    restaurant.destroy()
    res.redirect('/')
})

// Edit a restaurant by id
app.post('/:restaurantId/update', async(req, res) => {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    restaurant.update(req.body)
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

// Add a menu to a restaurant
app.post('/:restaurantId', async(req, res) => {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    const menu = await Menu.create(req.body)
    restaurant.addMenu(menu)
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

// Edit a menu by id from a restaurant
app.post('/:restaurantId/:menuId/update', async(req, res) => {
    const menu = await Menu.findByPk(req.params.menuId)
    menu.update(req.body)
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

// Delete a menu by id from a restaurant
app.get('/:restaurantId/:menuId/delete', async(req, res) => {
    const menu = await Menu.findByPk(req.params.menuId)
    menu.destroy()
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

// Add an item to a specific menu
app.post('/:restaurantId/:menuId/', async(req, res) => {
    const menu = await Menu.findByPk(req.params.menuId)
    const item = await Item.create(req.body)
    menu.addItem(item)
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    const menus = await restaurant.getMenus({
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

// Delete an item by id from a menu
app.get('/:restaurantId/:menuId/:itemId/delete', async(req, res) => {
    const item = await Item.findByPk(req.params.itemId)
    item.destroy()
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
        nest: true  
    })
    res.render('restaurant', {restaurant, menus})
})

app.listen(3000, async () => {
    db.sync().then(async () => {
        const restaurants = await Restaurant.findAll()
        if(restaurants.length > 0) return
        const taskQueue = data.map(async (json_restaurant) => {
                const restaurant = await Restaurant.create({name: json_restaurant.name, image: json_restaurant.image})
                const menus = await Promise.all(json_restaurant.menus.map(async (_menu) => {
                    const items = await Promise.all(_menu.items.map(({name, price}) => Item.create({name, price})))
                    const menu = await Menu.create({title: _menu.title})
                    return menu.setItems(items)
                }))
                return await restaurant.setMenus(menus)
            })
        await Promise.all(taskQueue).then(restaurants => {
            console.log(JSON.stringify(restaurants, null, 2))
        }).catch(console.error)
    })
    console.log('server running', 3000)
})