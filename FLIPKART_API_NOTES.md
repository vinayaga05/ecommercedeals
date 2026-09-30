# Flipkart Affiliate API Implementation Notes

## Implementation Status

✅ **Complete** - Fully implemented with error handling, rate limiting, and comprehensive tests

## API Details Implemented

### Endpoint
```
GET https://affiliate-api.flipkart.net/affiliate/product/json?id={productId}
```

### Authentication
Headers required:
- `Fk-Affiliate-Id`: Your affiliate ID from Flipkart dashboard
- `Fk-Affiliate-Token`: Your affiliate token from Flipkart dashboard

### Response Structure Handled

The implementation handles multiple response format variations:

```typescript
// Format 1: productBaseInfoV1 (newer format)
{
  productBaseInfoV1: {
    title: string,
    imageUrls: [{ '400': string, '800': string }],
    productBrand: string,
    productCategory: string,
    productDescription: string,
    availability: boolean,
    inStock: boolean
  },
  productShippingInfoV1: {
    sellerName: string
  },
  productBaseInfo: {
    maximumRetailPrice: { amount: number, currency: string },
    flipkartSellingPrice: { amount: number, currency: string },
    flipkartSpecialPrice: { amount: number, currency: string },
    offers: [{
      type: string,
      title: string,
      description: string,
      discountAmount: number
    }]
  }
}

// Format 2: productBaseInfo (legacy format)
{
  productBaseInfo: {
    title: string,
    imageUrls: string[],
    maximumRetailPrice: number,
    flipkartSellingPrice: number,
    flipkartSpecialPrice: number,
    availability: string | boolean,
    offers: [...]
  }
}
```

### Price Mapping

| Flipkart Field | Our Model Field | Notes |
|----------------|-----------------|-------|
| `maximumRetailPrice` | `mrp` | Original MRP |
| `flipkartSellingPrice` | `listedPrice` | Regular selling price |
| `flipkartSpecialPrice` | `couponPrice` | Special/promotional price |
| Bank offer (from offers array) | `bankOffer` | First bank offer discount |
| Bank offer title | `bankOfferLabel` | E.g., "HDFC Credit Card" |
| Min(all prices) | `effectivePrice` | Best price customer pays |

### Confidence Levels

- **CONFIRMED**: Product available, no conditional offers
- **CONDITIONAL**: Product available with special offers/bank discounts
- **ESTIMATED**: Product out of stock (price may be stale)

## Error Handling

### Implemented Retry Logic

| Status Code | Action | Retries | Backoff |
|-------------|--------|---------|---------|
| 429 (Rate Limit) | Retry | 3 | Exponential (2s, 4s, 8s) |
| 500-599 (Server Error) | Retry | 3 | Exponential (2s, 4s, 8s) |
| 404 (Not Found) | Fail immediately | 0 | N/A |
| 401/403 (Auth Error) | Fail immediately | 0 | N/A |

### Error Messages

- **404**: `Product {id} not found on Flipkart`
- **401/403**: `Flipkart API authentication failed. Check FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN.`
- **429**: Automatic retry with exponential backoff
- **500+**: Automatic retry with exponential backoff

## Testing

### Unit Tests (All Passing)

Tests use fixture responses, **no live API calls**:

1. ✅ Full price breakdown parsing
2. ✅ Out of stock handling
3. ✅ Rate limit retry (429)
4. ✅ Server error retry (500)
5. ✅ Authentication error (401)
6. ✅ Product not found (404)
7. ✅ Products without offers
8. ✅ String availability format ("In Stock")
9. ✅ URL parsing (multiple formats)
10. ✅ Health check (with/without credentials)

### Test Fixtures

All tests use mock responses based on expected API structure. No real credentials or live API calls are made during testing.

## Known Limitations & Assumptions

### ⚠️ Not Verified Against Live API

**Important**: This implementation is based on Flipkart Affiliate API documentation and common API patterns. It has **NOT been tested against the live Flipkart API**.

### Assumptions Made

1. **Response Format**: Assumed either `productBaseInfoV1` or `productBaseInfo` structure
2. **Price Objects**: Assumed `{ amount, currency }` format or direct number values
3. **Image URLs**: Handled both object `{ '400': url, '800': url }` and string array formats
4. **Availability**: Handled boolean, string ("In Stock", "Available"), and `inStock` field variations
5. **Rate Limit**: Assumed ~10 requests/minute (may need adjustment)

### May Need Adjustment

When integrating with live Flipkart API, you may need to adjust:

- Response field paths (check actual JSON structure)
- Price extraction logic (verify object vs. primitive types)
- Availability detection (confirm field names and values)
- Image URL format (verify actual response structure)
- Rate limit values (based on actual API limits)
- Retry delays (based on API recommendations)

## Configuration

### Environment Variables

```env
# Required for Flipkart provider
FLIPKART_AFFILIATE_ID=your_affiliate_id
FLIPKART_AFFILIATE_TOKEN=your_affiliate_token

# Provider selection
PRICE_PROVIDER=production  # Uses real providers
# PRICE_PROVIDER=mock      # Falls back to mock (default)

# Rate limiting
RATE_LIMIT_FLIPKART=10  # Requests per minute

# Worker settings
WORKER_CONCURRENCY=5    # Concurrent price checks
```

### Fallback Behavior

When Flipkart credentials are not configured:
- `isHealthy()` returns `false`
- System falls back to mock provider
- No errors thrown, graceful degradation

## How to Obtain Credentials

1. Sign up at https://affiliate.flipkart.com/
2. Complete affiliate account setup
3. Navigate to "API" or "Developer" section
4. Generate API credentials:
   - Affiliate ID
   - Affiliate Token
5. Copy credentials to `.env` file
6. Restart API: `docker compose restart api worker`

## Monitoring & Debugging

### Logs to Watch

```bash
# Check Flipkart API calls
docker compose logs api | grep Flipkart

# Monitor rate limits
docker compose logs api | grep "Rate limit hit"

# Check authentication issues
docker compose logs api | grep "authentication failed"
```

### Common Issues

**"Product not found"**
- Verify product ID format
- Check if product exists on Flipkart
- Confirm product is part of affiliate program

**"Authentication failed"**
- Verify `FLIPKART_AFFILIATE_ID` is correct
- Verify `FLIPKART_AFFILIATE_TOKEN` is correct
- Check credentials haven't expired
- Confirm affiliate account is active

**Rate limit exceeded**
- Increase `RATE_LIMIT_FLIPKART` (carefully)
- Reduce `WORKER_CONCURRENCY`
- Reduce `SCHEDULER_BATCH_SIZE`

## Next Steps

1. **Obtain Flipkart credentials** from affiliate dashboard
2. **Test against live API** with known product IDs
3. **Verify response structure** matches implementation
4. **Adjust parsing logic** if needed based on actual responses
5. **Document any API differences** encountered
6. **Monitor error rates** in production
7. **Tune rate limits** based on actual API behavior

## Contributing

If you encounter API structure differences:

1. Capture actual API response (sanitize credentials)
2. Document field differences
3. Update parser logic
4. Add test case with real structure
5. Update this documentation
