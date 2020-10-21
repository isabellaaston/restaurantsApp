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
app.engine('handlebars', handlebars)
app.set('view engine', 'handlebars')

app.get('/', async(req, res) => {
    const restaurants = await Restaurant.findAll({
        include: [{model: Menu, as: 'menus'}],
        nest:true
    })
    res.render('home', {restaurants})
})

app.get('/:name', async(req, res) => {
    const restaurant = await Restaurant.findOne({where: {name: req.params.name}})
    const menus = await restaurant.getMenus( {
        include: [{model: Item, as: 'items'}],
          nest: true  
      })
    res.render('restaurant', {restaurant, menus})
})

app.post('/:name/:id/add', async(req, res) => {
    const restaurant = await Restaurant.findOne({where: {name: req.params.name}})
    const menus = await Menu.findByPk(req.params.id)
    
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