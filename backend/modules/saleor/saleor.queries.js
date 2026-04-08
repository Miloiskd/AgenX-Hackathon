/**
 * Saleor GraphQL Queries
 *
 * All interaction with Saleor is done exclusively via its public GraphQL API.
 * No direct database access or internal imports from Saleor's codebase.
 */

export const GET_ORDER_BY_ID = `
  query GetOrderById($id: ID!) {
    order(id: $id) {
      id
      number
      status
      created
      updatedAt
      channel {
        slug
        name
        currencyCode
      }
      total {
        gross { amount currency }
        net   { amount currency }
        tax   { amount currency }
      }
      subtotal {
        gross { amount currency }
        net   { amount currency }
      }
      shippingPrice {
        gross { amount currency }
      }
      paymentStatus
      isPaid
      payments {
        id
        gateway
        isActive
        chargeStatus
        total { amount currency }
        capturedAmount { amount currency }
        transactions {
          id
          token
          kind
          isSuccess
          error
          amount { amount currency }
          created
        }
      }
      fulfillments {
        id
        status
        trackingNumber
        lines {
          quantity
          orderLine {
            productName
            variantName
            productSku
          }
        }
      }
      lines {
        id
        productName
        variantName
        productSku
        quantity
        quantityFulfilled
        unitPrice {
          gross { amount currency }
        }
        variant {
          id
          product {
            id
            name
            slug
          }
        }
      }
      billingAddress {
        firstName
        lastName
        streetAddress1
        city
        country { country code }
        postalCode
        phone
      }
      shippingAddress {
        firstName
        lastName
        streetAddress1
        city
        country { country code }
        postalCode
        phone
      }
      user {
        id
        email
        firstName
        lastName
        isActive
      }
      userEmail
      errors: events(filter: {type: OTHER}) {
        date
        type
        message
        user { email }
      }
    }
  }
`;

export const GET_ORDER_BY_NUMBER = `
  query GetOrderByNumber($number: String!) {
    orders(first: 1, filter: { search: $number }) {
      edges {
        node {
          id
          number
          status
          created
          updatedAt
          total {
            gross { amount currency }
          }
          paymentStatus
          isPaid
          user {
            id
            email
            firstName
            lastName
          }
          userEmail
          lines {
            id
            productName
            variantName
            productSku
            quantity
            unitPrice { gross { amount currency } }
          }
          fulfillments {
            id
            status
            trackingNumber
          }
          payments {
            id
            gateway
            chargeStatus
            total { amount currency }
            transactions {
              id
              kind
              isSuccess
              error
              amount { amount currency }
            }
          }
        }
      }
    }
  }
`;

export const GET_CUSTOMER_BY_EMAIL = `
  query GetCustomerByEmail($email: String!) {
    customers(first: 1, filter: { search: $email }) {
      edges {
        node {
          id
          email
          firstName
          lastName
          isActive
          dateJoined
          lastLogin
          orders(first: 5) {
            totalCount
            edges {
              node {
                id
                number
                status
                total { gross { amount currency } }
                created
              }
            }
          }
          defaultShippingAddress {
            streetAddress1
            city
            country { country code }
            postalCode
          }
          metadata {
            key
            value
          }
        }
      }
    }
  }
`;

export const GET_PRODUCT_BY_ID = `
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      name
      slug
      description
      isAvailable
      isAvailableForPurchase
      rating
      category {
        id
        name
        slug
      }
      defaultVariant {
        id
        name
        sku
        quantityAvailable
        stocks {
          warehouse { name slug }
          quantity
          quantityAllocated
        }
        pricing {
          price { gross { amount currency } }
          discount { gross { amount currency } }
          onSale
        }
      }
      variants {
        id
        name
        sku
        quantityAvailable
        stocks {
          warehouse { name slug }
          quantity
          quantityAllocated
        }
      }
      thumbnail { url alt }
      media { url alt type }
    }
  }
`;

export const GET_PAYMENT_BY_ID = `
  query GetPaymentById($id: ID!) {
    payment(id: $id) {
      id
      gateway
      isActive
      chargeStatus
      created
      modified
      capturedAmount { amount currency }
      total { amount currency }
      creditCard {
        brand
        lastDigits
        expMonth
        expYear
        firstDigits
      }
      order {
        id
        number
        status
        user { email }
      }
      transactions {
        id
        token
        kind
        isSuccess
        error
        amount { amount currency }
        gatewayResponse
        created
      }
      metadata {
        key
        value
      }
    }
  }
`;

export const GET_TRANSACTION_BY_ID = `
  query GetTransactionById($id: ID!) {
    transaction(id: $id) {
      id
      type
      reference
      status
      message
      createdAt
      updatedAt
      authorizedAmount { amount currency }
      chargedAmount    { amount currency }
      refundedAmount   { amount currency }
      canceledAmount   { amount currency }
      order {
        id
        number
        status
        user { email }
      }
      events {
        id
        type
        amount { amount currency }
        createdAt
        message
      }
    }
  }
`;
