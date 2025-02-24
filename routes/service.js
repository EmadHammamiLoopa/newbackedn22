const express = require('express')
const Response = require('../app/controllers/Response')
const { 
    showService, 
    storeService, 
    updateService, 
    postedServices, 
    availableServices, 
    allServices, 
    showServiceDash, 
    destroyService, 
    clearServiceReports, 
    reportService,
    toggleServiceStatus
} = require('../app/controllers/ServiceController')
const { requireSignin, isAdmin, withAuthUser } = require('../app/middlewares/auth')
const form = require('../app/middlewares/form')
const { serviceById, serviceOwner, serviceStorePermission } = require('../app/middlewares/Service')
const { storeServiceValidator, updateServiceValidator } = require('../app/middlewares/validators/serviceValidator')
const router = express.Router()

router.get('/all', [requireSignin, isAdmin], allServices)
router.get('/dash/:serviceId', [requireSignin, isAdmin], showServiceDash)
router.delete('/dash/:serviceId', [requireSignin, isAdmin], destroyService)

router.get('/posted', [requireSignin], postedServices)
router.get('/available', [requireSignin, withAuthUser], availableServices)
router.post('/', [form, requireSignin, storeServiceValidator], storeService)
// router.post('/disable/:serviceId', [requireSignin, serviceOwner], disableService)
router.get('/storePermession', [requireSignin, withAuthUser, serviceStorePermission], (req, res) => Response.sendResponse(res, true))

router.post('/:serviceId/status', [requireSignin, isAdmin], toggleServiceStatus)

router.post('/:serviceId/clearReports', [requireSignin, isAdmin], clearServiceReports)
router.get('/:serviceId',[requireSignin], showService)
router.put('/:serviceId', [form, requireSignin, serviceOwner, updateServiceValidator], updateService)
router.delete('/:serviceId', [requireSignin, serviceOwner], destroyService)
router.post('/:serviceId/report', [requireSignin], reportService)


router.param('serviceId', serviceById)

module.exports = router
