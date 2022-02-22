# Stripe Gradient

A reverse engineered, and simplified javascript library to replicate the animated [Stripe](https://stripe.com/) gradients.

## Basic usage

**HTML**

```html
<canvas id="my-canvas-id"></canvas>
```

**JavasScript**
```javascript
new Gradient({
    canvas: '#my-canvas-id',
    colors: ['#a960ee', '#ff333d', '#90e0ff', '#ffcb57']
});
```


## jQuery ready

```javascript
$('#my-canvas-id').gradient({
    colors: ['#a960ee', '#ff333d', '#90e0ff', '#ffcb57']
});
```
