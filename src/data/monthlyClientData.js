export const feeRates = {
  "julius-baer": {
    "rebateAnnualRate": 0.003221070905091383,
    "advisoryAnnualRate": 0.0056674609242583695
  },
  "credo": {
    "rebateAnnualRate": 0.003,
    "advisoryAnnualRate": 0.006
  },
  "gryphon": {
    "rebateAnnualRate": 0.0025,
    "advisoryAnnualRate": 0.005
  },
  "prime": {
    "rebateAnnualRate": 0.0025,
    "advisoryAnnualRate": 0.005
  },
  "northstar-fnb": {
    "rebateAnnualRate": 0.0,
    "advisoryAnnualRate": 0.005
  },
  "northstar-sanlam": {
    "rebateAnnualRate": 0.0,
    "advisoryAnnualRate": 0.005
  },
  "peresec": {
    "rebateAnnualRate": 0.0,
    "advisoryAnnualRate": 0.005
  },
  "prescient": {
    "rebateAnnualRate": 0.0,
    "advisoryAnnualRate": 0.005
  }
};

export const monthlyClientData = [
  {
    "id": "jan-2026",
    "label": "Jan 2026",
    "sourceFile": "Jan.xlsx",
    "exchangeRates": {
      "USD": 16.139,
      "ZAR": 1
    },
    "sourceNativeTotals": {
      "USD": 32973688.220000003,
      "ZAR": 635493828.4258401
    },
    "sourceZarTotals": {
      "USD": 532162354.18258,
      "ZAR": 635493828.4258401
    },
    "sourceZarTotal": 1167656182.6084201,
    "providerSourceTotals": {
      "prime": {
        "providerName": "Prime Investments",
        "nativeUsd": 0.0,
        "zarTotal": 213445537.93000013
      },
      "credo": {
        "providerName": "Credo",
        "nativeUsd": 11896031.0,
        "zarTotal": 191990044.309
      },
      "gryphon": {
        "providerName": "Gryphon",
        "nativeUsd": 0.0,
        "zarTotal": 373239158.2458401
      },
      "julius-baer": {
        "providerName": "Julius Baer",
        "nativeUsd": 20544106.630000003,
        "zarTotal": 331561336.90157
      },
      "northstar-fnb": {
        "providerName": "Northstar FNB",
        "nativeUsd": 533550.59,
        "zarTotal": 8610972.97201
      },
      "northstar-sanlam": {
        "providerName": "Northstar Sanlam",
        "nativeUsd": 0.0,
        "zarTotal": 3007494.02
      },
      "peresec": {
        "providerName": "Peresec",
        "nativeUsd": 0.0,
        "zarTotal": 3333644.92
      },
      "prescient": {
        "providerName": "Prescient",
        "nativeUsd": 0.0,
        "zarTotal": 42467993.31
      }
    },
    "clients": [
      {
        "id": "credo|10012899|Blackbeard, Ginette",
        "client": "Blackbeard, Ginette",
        "accountCode": "10012899",
        "identityNo": "8002160132088",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 179116.0
        },
        "zarAum": 2890753.124,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1058.0,
            "zarValue": 17075.061999999998
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 178058.0,
            "zarValue": 2873678.062
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 44.778999999999996
            },
            "zarFee": 722.6882810000001
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 89.55799999999999
            },
            "zarFee": 1445.3765620000001
          },
          "total": {
            "nativeFees": {
              "USD": 134.337
            },
            "zarFee": 2168.064843
          }
        }
      },
      {
        "id": "credo|10016497|Chin, Ashley",
        "client": "Chin, Ashley",
        "accountCode": "10016497",
        "identityNo": "7403295134083",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 118353.0
        },
        "zarAum": 1910099.067,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 678.0,
            "zarValue": 10942.242
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 117675.0,
            "zarValue": 1899156.825
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 29.588250000000002
            },
            "zarFee": 477.52476675
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 59.176500000000004
            },
            "zarFee": 955.0495335
          },
          "total": {
            "nativeFees": {
              "USD": 88.76475
            },
            "zarFee": 1432.57430025
          }
        }
      },
      {
        "id": "credo|10023274|Conder, Andrew",
        "client": "Conder, Andrew",
        "accountCode": "10023274",
        "identityNo": "7112126465182",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 416404.0
        },
        "zarAum": 6720344.1559999995,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 2742.0,
            "zarValue": 44253.138
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 193516.0,
            "zarValue": 3123154.724
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 111783.0,
            "zarValue": 1804065.8369999998
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 108363.0,
            "zarValue": 1748870.457
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 104.101
            },
            "zarFee": 1680.0860389999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 208.202
            },
            "zarFee": 3360.1720779999996
          },
          "total": {
            "nativeFees": {
              "USD": 312.303
            },
            "zarFee": 5040.258116999999
          }
        }
      },
      {
        "id": "credo|10015189|Diva Trust",
        "client": "Diva Trust",
        "accountCode": "10015189",
        "identityNo": "10015189",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 307236.0
        },
        "zarAum": 4958481.804,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1428.0,
            "zarValue": 23046.492
          },
          {
            "investment": "Harmony Capital Limited Special Situations Class",
            "currency": "USD",
            "nativeValue": 2817.0,
            "zarValue": 45463.562999999995
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 302991.0,
            "zarValue": 4889971.749
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 76.809
            },
            "zarFee": 1239.620451
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 153.618
            },
            "zarFee": 2479.240902
          },
          "total": {
            "nativeFees": {
              "USD": 230.427
            },
            "zarFee": 3718.8613530000002
          }
        }
      },
      {
        "id": "credo|10015188|Divaris, Belle Norma",
        "client": "Divaris, Belle Norma",
        "accountCode": "10015188",
        "identityNo": "5407090212087",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 54730.0
        },
        "zarAum": 883287.47,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 417.0,
            "zarValue": 6729.963
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 54313.0,
            "zarValue": 876557.507
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 13.6825
            },
            "zarFee": 220.82186750000002
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 27.365
            },
            "zarFee": 441.64373500000005
          },
          "total": {
            "nativeFees": {
              "USD": 41.0475
            },
            "zarFee": 662.4656025
          }
        }
      },
      {
        "id": "credo|10006632|Fallows, Christopher & Monique",
        "client": "Fallows, Christopher & Monique",
        "accountCode": "10006632",
        "identityNo": "7209215223082",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 1586355.0
        },
        "zarAum": 25602183.344999995,
        "holdingCount": 11,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 75263.0,
            "zarValue": 1214669.557
          },
          {
            "investment": "Volkswagen AG",
            "currency": "USD",
            "nativeValue": 11438.0,
            "zarValue": 184597.88199999998
          },
          {
            "investment": "Fundsmith Equity Fund",
            "currency": "USD",
            "nativeValue": 126289.0,
            "zarValue": 2038178.1709999999
          },
          {
            "investment": "Scottish Mortgage Investment Trust",
            "currency": "USD",
            "nativeValue": 46832.0,
            "zarValue": 755821.6479999999
          },
          {
            "investment": "HG Capital Trust",
            "currency": "USD",
            "nativeValue": 20492.0,
            "zarValue": 330720.388
          },
          {
            "investment": "Invesco Solar ETF",
            "currency": "USD",
            "nativeValue": 37094.0,
            "zarValue": 598660.066
          },
          {
            "investment": "iShares Global Tech ETF",
            "currency": "USD",
            "nativeValue": 151105.0,
            "zarValue": 2438683.5949999997
          },
          {
            "investment": "Jinkosolar Holding Co Ltd",
            "currency": "USD",
            "nativeValue": 44109.0,
            "zarValue": 711875.151
          },
          {
            "investment": "Kraneshares CSI China Internet ETF",
            "currency": "USD",
            "nativeValue": 28910.0,
            "zarValue": 466578.49
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 915898.0,
            "zarValue": 14781677.821999999
          },
          {
            "investment": "Prescient China Balanced Fund ",
            "currency": "USD",
            "nativeValue": 128925.0,
            "zarValue": 2080720.575
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 396.58875000000006
            },
            "zarFee": 6400.545836249999
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 793.1775000000001
            },
            "zarFee": 12801.091672499999
          },
          "total": {
            "nativeFees": {
              "USD": 1189.7662500000001
            },
            "zarFee": 19201.63750875
          }
        }
      },
      {
        "id": "credo|10018459|Gennari, Enrico",
        "client": "Gennari, Enrico",
        "accountCode": "10018459",
        "identityNo": "YA3997806",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 73799.0
        },
        "zarAum": 1191042.0609999998,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1774.0,
            "zarValue": 28630.586
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 72025.0,
            "zarValue": 1162411.4749999999
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 18.449749999999998
            },
            "zarFee": 297.76051524999997
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 36.899499999999996
            },
            "zarFee": 595.5210304999999
          },
          "total": {
            "nativeFees": {
              "USD": 55.34925
            },
            "zarFee": 893.2815457499999
          }
        }
      },
      {
        "id": "credo|10022560|Hoar, Bianca",
        "client": "Hoar, Bianca",
        "accountCode": "10022560",
        "identityNo": "9902050064086",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 134883.0
        },
        "zarAum": 2176876.7369999997,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 2477.0,
            "zarValue": 39976.303
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 51772.0,
            "zarValue": 835548.308
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 80634.0,
            "zarValue": 1301352.126
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 33.72075
            },
            "zarFee": 544.21918425
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 67.4415
            },
            "zarFee": 1088.4383685
          },
          "total": {
            "nativeFees": {
              "USD": 101.16225
            },
            "zarFee": 1632.65755275
          }
        }
      },
      {
        "id": "credo|10016626|Ikigai Trust",
        "client": "Ikigai Trust",
        "accountCode": "10016626",
        "identityNo": "C17145460",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 3941455.0
        },
        "zarAum": 63611142.245,
        "holdingCount": 10,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 9188.0,
            "zarValue": 148285.13199999998
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 328625.0,
            "zarValue": 5303678.875
          },
          {
            "investment": "Global X Copper Miners ETF",
            "currency": "USD",
            "nativeValue": 22031.0,
            "zarValue": 355558.309
          },
          {
            "investment": "Nomura Global High Conviction Fund",
            "currency": "USD",
            "nativeValue": 21343.0,
            "zarValue": 344454.67699999997
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 159490.0,
            "zarValue": 2574009.11
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 220882.0,
            "zarValue": 3564814.5979999998
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 140472.0,
            "zarValue": 2267077.608
          },
          {
            "investment": "Prescient China Balanced Fund ",
            "currency": "USD",
            "nativeValue": 30803.0,
            "zarValue": 497129.61699999997
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 2973705.0,
            "zarValue": 47992624.995
          },
          {
            "investment": "iShares Bitcoin Trust ETF",
            "currency": "USD",
            "nativeValue": 34916.0,
            "zarValue": 563509.324
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 985.36375
            },
            "zarFee": 15902.785561249999
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 1970.7275
            },
            "zarFee": 31805.571122499998
          },
          "total": {
            "nativeFees": {
              "USD": 2956.09125
            },
            "zarFee": 47708.35668375
          }
        }
      },
      {
        "id": "credo|10019107|Irving Trust",
        "client": "Irving Trust",
        "accountCode": "10019107",
        "identityNo": "158906",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 581245.0
        },
        "zarAum": 9380713.055,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 133.0,
            "zarValue": 2146.487
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 444736.0,
            "zarValue": 7177594.304
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 136376.0,
            "zarValue": 2200972.264
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 145.31125
            },
            "zarFee": 2345.17826375
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 290.6225
            },
            "zarFee": 4690.3565275
          },
          "total": {
            "nativeFees": {
              "USD": 435.93375000000003
            },
            "zarFee": 7035.53479125
          }
        }
      },
      {
        "id": "credo||Jackson, Matt",
        "client": "Jackson, Matt",
        "accountCode": "",
        "identityNo": "9708125146083",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 5017.0
        },
        "zarAum": 80969.363,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": -14.0,
            "zarValue": -225.946
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 5031.0,
            "zarValue": 81195.309
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 1.25425
            },
            "zarFee": 20.24234075
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 2.5085
            },
            "zarFee": 40.4846815
          },
          "total": {
            "nativeFees": {
              "USD": 3.7627500000000005
            },
            "zarFee": 60.727022250000005
          }
        }
      },
      {
        "id": "credo|10018479|Malby, Francoise",
        "client": "Malby, Francoise",
        "accountCode": "10018479",
        "identityNo": "5407180767180",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 317479.0
        },
        "zarAum": 5123793.580999999,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1476.0,
            "zarValue": 23821.164
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 316003.0,
            "zarValue": 5099972.416999999
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 79.36975
            },
            "zarFee": 1280.9483952499997
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 158.7395
            },
            "zarFee": 2561.8967904999995
          },
          "total": {
            "nativeFees": {
              "USD": 238.10924999999997
            },
            "zarFee": 3842.8451857499995
          }
        }
      },
      {
        "id": "credo|10017234|Mandy, Sean Gary",
        "client": "Mandy, Sean Gary",
        "accountCode": "10017234",
        "identityNo": "6504225046080",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 1494.0
        },
        "zarAum": 24111.665999999997,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1494.0,
            "zarValue": 24111.665999999997
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 0.3735
            },
            "zarFee": 6.0279165
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 0.747
            },
            "zarFee": 12.055833
          },
          "total": {
            "nativeFees": {
              "USD": 1.1205
            },
            "zarFee": 18.0837495
          }
        }
      },
      {
        "id": "credo|10019456|Manolas, Viron",
        "client": "Manolas, Viron",
        "accountCode": "10019456",
        "identityNo": "7803285054086",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 51543.0
        },
        "zarAum": 831852.477,
        "holdingCount": 6,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 3388.0,
            "zarValue": 54678.932
          },
          {
            "investment": "Apple Inc",
            "currency": "USD",
            "nativeValue": 3892.0,
            "zarValue": 62812.988
          },
          {
            "investment": "Defiance Quantum ETF",
            "currency": "USD",
            "nativeValue": 2895.0,
            "zarValue": 46722.405
          },
          {
            "investment": "Invesco Nasdaq 100 ETF",
            "currency": "USD",
            "nativeValue": 4609.0,
            "zarValue": 74384.651
          },
          {
            "investment": "Invesco S&P 500 Momentum ETF",
            "currency": "USD",
            "nativeValue": 4675.0,
            "zarValue": 75449.825
          },
          {
            "investment": "RSA Government Bond",
            "currency": "USD",
            "nativeValue": 32084.0,
            "zarValue": 517803.676
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 12.88575
            },
            "zarFee": 207.96311924999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 25.7715
            },
            "zarFee": 415.92623849999995
          },
          "total": {
            "nativeFees": {
              "USD": 38.65725
            },
            "zarFee": 623.8893577499999
          }
        }
      },
      {
        "id": "credo|10006739|Maxwell, Dave",
        "client": "Maxwell, Dave",
        "accountCode": "10006739",
        "identityNo": "6610245172085\t",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 303222.0
        },
        "zarAum": 4893699.857999999,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1687.0,
            "zarValue": 27226.493
          },
          {
            "investment": "iShares Global 100 ETF",
            "currency": "USD",
            "nativeValue": 141296.0,
            "zarValue": 2280376.144
          },
          {
            "investment": "iShares Physical Gold ETF",
            "currency": "USD",
            "nativeValue": 66234.0,
            "zarValue": 1068950.526
          },
          {
            "investment": "BBVA Global Markets ",
            "currency": "USD",
            "nativeValue": 94005.0,
            "zarValue": 1517146.6949999998
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 75.80550000000001
            },
            "zarFee": 1223.4249644999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 151.61100000000002
            },
            "zarFee": 2446.8499289999995
          },
          "total": {
            "nativeFees": {
              "USD": 227.41650000000004
            },
            "zarFee": 3670.274893499999
          }
        }
      },
      {
        "id": "credo|10015068|McGuirk, Pamela",
        "client": "McGuirk, Pamela",
        "accountCode": "10015068",
        "identityNo": "09021951/1",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 706794.0
        },
        "zarAum": 11406948.365999999,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 10439.0,
            "zarValue": 168475.02099999998
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 696355.0,
            "zarValue": 11238473.344999999
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 176.6985
            },
            "zarFee": 2851.7370914999997
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 353.397
            },
            "zarFee": 5703.474182999999
          },
          "total": {
            "nativeFees": {
              "USD": 530.0955
            },
            "zarFee": 8555.2112745
          }
        }
      },
      {
        "id": "credo|10015250|Sommer, Anna-Maria",
        "client": "Sommer, Anna-Maria",
        "accountCode": "10015250",
        "identityNo": "C354KY7M7",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 2811527.0
        },
        "zarAum": 45375234.253,
        "holdingCount": 13,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 2284.0,
            "zarValue": 36861.475999999995
          },
          {
            "investment": "Digihost Technology Inc",
            "currency": "USD",
            "nativeValue": 2038.0,
            "zarValue": 32891.282
          },
          {
            "investment": "HG Capital Trust",
            "currency": "USD",
            "nativeValue": 53953.0,
            "zarValue": 870747.467
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 251999.0,
            "zarValue": 4067011.861
          },
          {
            "investment": "Amplify Transformational Data Sharing ETF",
            "currency": "USD",
            "nativeValue": 30436.0,
            "zarValue": 491206.604
          },
          {
            "investment": "Global X Copper Miners ETF",
            "currency": "USD",
            "nativeValue": 85413.0,
            "zarValue": 1378480.407
          },
          {
            "investment": "Dodge & Cox Worldwide Funds",
            "currency": "USD",
            "nativeValue": 81219.0,
            "zarValue": 1310793.4409999999
          },
          {
            "investment": "Nomura Global High Conviction Fund",
            "currency": "USD",
            "nativeValue": 67662.0,
            "zarValue": 1091997.018
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1645625.0,
            "zarValue": 26558741.875
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 258297.0,
            "zarValue": 4168655.283
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 163504.0,
            "zarValue": 2638791.056
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 147720.0,
            "zarValue": 2384053.08
          },
          {
            "investment": "iShares Bitcoin Trust ETF",
            "currency": "USD",
            "nativeValue": 21377.0,
            "zarValue": 345003.403
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 702.88175
            },
            "zarFee": 11343.80856325
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 1405.7635
            },
            "zarFee": 22687.6171265
          },
          "total": {
            "nativeFees": {
              "USD": 2108.64525
            },
            "zarFee": 34031.42568975
          }
        }
      },
      {
        "id": "credo|10014441|Von Arnim, Hildegard ",
        "client": "Von Arnim, Hildegard ",
        "accountCode": "10014441",
        "identityNo": "5004210080187",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 305379.0
        },
        "zarAum": 4928511.681,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1558.0,
            "zarValue": 25144.561999999998
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 303821.0,
            "zarValue": 4903367.119
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 76.34475
            },
            "zarFee": 1232.12792025
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 152.6895
            },
            "zarFee": 2464.2558405
          },
          "total": {
            "nativeFees": {
              "USD": 229.03425000000001
            },
            "zarFee": 3696.38376075
          }
        }
      },
      {
        "id": "gryphon|7034|Abrahams, Denise",
        "client": "Abrahams, Denise",
        "accountCode": "7034",
        "identityNo": "7207200339087",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 13262687.52
        },
        "zarAum": 13262687.52,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 13262687.52,
            "zarValue": 13262687.52
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2763.0599
            },
            "zarFee": 2763.0599
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 5526.1198
            },
            "zarFee": 5526.1198
          },
          "total": {
            "nativeFees": {
              "ZAR": 8289.1797
            },
            "zarFee": 8289.1797
          }
        }
      },
      {
        "id": "gryphon|4972|Apex Holdings (Pty) Ltd",
        "client": "Apex Holdings (Pty) Ltd",
        "accountCode": "4972",
        "identityNo": "2015/068524/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1301224.512092
        },
        "zarAum": 1301224.512092,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 1301224.512092,
            "zarValue": 1301224.512092
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 271.0884400191667
            },
            "zarFee": 271.0884400191667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 542.1768800383334
            },
            "zarFee": 542.1768800383334
          },
          "total": {
            "nativeFees": {
              "ZAR": 813.2653200575
            },
            "zarFee": 813.2653200575
          }
        }
      },
      {
        "id": "gryphon|5724|Apex Images CC",
        "client": "Apex Images CC",
        "accountCode": "5724",
        "identityNo": "2009/040089/23",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 859311.284118
        },
        "zarAum": 859311.284118,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 859311.284118,
            "zarValue": 859311.284118
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 179.02318419125
            },
            "zarFee": 179.02318419125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 358.0463683825
            },
            "zarFee": 358.0463683825
          },
          "total": {
            "nativeFees": {
              "ZAR": 537.06955257375
            },
            "zarFee": 537.06955257375
          }
        }
      },
      {
        "id": "gryphon|5215|Apex Shark Expeditions (Pty) Ltd",
        "client": "Apex Shark Expeditions (Pty) Ltd",
        "accountCode": "5215",
        "identityNo": "2015/194079/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 524147.016902
        },
        "zarAum": 524147.016902,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 524147.016902,
            "zarValue": 524147.016902
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 109.19729518791667
            },
            "zarFee": 109.19729518791667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 218.39459037583333
            },
            "zarFee": 218.39459037583333
          },
          "total": {
            "nativeFees": {
              "ZAR": 327.59188556375
            },
            "zarFee": 327.59188556375
          }
        }
      },
      {
        "id": "gryphon|5202|Bambino International (Pty) Ltd",
        "client": "Bambino International (Pty) Ltd",
        "accountCode": "5202",
        "identityNo": "1986/002665/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 42343446.43863
        },
        "zarAum": 42343446.43863,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 42343446.43863,
            "zarValue": 42343446.43863
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 8821.55134138125
            },
            "zarFee": 8821.55134138125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 17643.1026827625
            },
            "zarFee": 17643.1026827625
          },
          "total": {
            "nativeFees": {
              "ZAR": 26464.654024143747
            },
            "zarFee": 26464.654024143747
          }
        }
      },
      {
        "id": "gryphon|5531|Briggs, Carol-Anne",
        "client": "Briggs, Carol-Anne",
        "accountCode": "5531",
        "identityNo": "5707030094085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1732782.900528
        },
        "zarAum": 1732782.900528,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 899584.471836,
            "zarValue": 899584.471836
          },
          {
            "investment": "Gryphon Dividend Income Fund C",
            "currency": "ZAR",
            "nativeValue": 833198.428692,
            "zarValue": 833198.428692
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 360.99643761
            },
            "zarFee": 360.99643761
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 721.99287522
            },
            "zarFee": 721.99287522
          },
          "total": {
            "nativeFees": {
              "ZAR": 1082.98931283
            },
            "zarFee": 1082.98931283
          }
        }
      },
      {
        "id": "gryphon|5195|Chin, Ashley",
        "client": "Chin, Ashley",
        "accountCode": "5195",
        "identityNo": "7403295134083",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 2960117.998718
        },
        "zarAum": 2960117.998718,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 2960117.998718,
            "zarValue": 2960117.998718
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 616.6912497329166
            },
            "zarFee": 616.6912497329166
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1233.3824994658332
            },
            "zarFee": 1233.3824994658332
          },
          "total": {
            "nativeFees": {
              "ZAR": 1850.0737491987497
            },
            "zarFee": 1850.0737491987497
          }
        }
      },
      {
        "id": "gryphon|5025|De Mey, Armelle",
        "client": "De Mey, Armelle",
        "accountCode": "5025",
        "identityNo": "6007020264189",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 242686.936595
        },
        "zarAum": 242686.936595,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 242686.936595,
            "zarValue": 242686.936595
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 50.559778457291664
            },
            "zarFee": 50.559778457291664
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 101.11955691458333
            },
            "zarFee": 101.11955691458333
          },
          "total": {
            "nativeFees": {
              "ZAR": 151.679335371875
            },
            "zarFee": 151.679335371875
          }
        }
      },
      {
        "id": "gryphon|5218|De Mey, Katinga",
        "client": "De Mey, Katinga",
        "accountCode": "5218",
        "identityNo": "9606210194085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 203748.630378
        },
        "zarAum": 203748.630378,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 203748.630378,
            "zarValue": 203748.630378
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 42.44763132875
            },
            "zarFee": 42.44763132875
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 84.8952626575
            },
            "zarFee": 84.8952626575
          },
          "total": {
            "nativeFees": {
              "ZAR": 127.34289398625
            },
            "zarFee": 127.34289398625
          }
        }
      },
      {
        "id": "gryphon|5447|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "5447",
        "identityNo": "6510245060084",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 4595141.53457
        },
        "zarAum": 4595141.53457,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 4595141.53457,
            "zarValue": 4595141.53457
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 957.3211530354166
            },
            "zarFee": 957.3211530354166
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1914.6423060708332
            },
            "zarFee": 1914.6423060708332
          },
          "total": {
            "nativeFees": {
              "ZAR": 2871.96345910625
            },
            "zarFee": 2871.96345910625
          }
        }
      },
      {
        "id": "gryphon|4858|Fallows, Monique Louise",
        "client": "Fallows, Monique Louise",
        "accountCode": "4858",
        "identityNo": "7901040119085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1861653.528855
        },
        "zarAum": 1861653.528855,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 1861653.528855,
            "zarValue": 1861653.528855
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 387.844485178125
            },
            "zarFee": 387.844485178125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 775.68897035625
            },
            "zarFee": 775.68897035625
          },
          "total": {
            "nativeFees": {
              "ZAR": 1163.533455534375
            },
            "zarFee": 1163.533455534375
          }
        }
      },
      {
        "id": "gryphon|7002|Freed, Justin",
        "client": "Freed, Justin",
        "accountCode": "7002",
        "identityNo": "7306135199085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 23318884.554317
        },
        "zarAum": 23318884.554317,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 23318884.554317,
            "zarValue": 23318884.554317
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 4858.100948816043
            },
            "zarFee": 4858.100948816043
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 9716.201897632085
            },
            "zarFee": 9716.201897632085
          },
          "total": {
            "nativeFees": {
              "ZAR": 14574.302846448129
            },
            "zarFee": 14574.302846448129
          }
        }
      },
      {
        "id": "gryphon|7001|Freed, Wayne",
        "client": "Freed, Wayne",
        "accountCode": "7001",
        "identityNo": "7711225229082",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 22658225.700246
        },
        "zarAum": 22658225.700246,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 22658225.700246,
            "zarValue": 22658225.700246
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 4720.46368755125
            },
            "zarFee": 4720.46368755125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 9440.9273751025
            },
            "zarFee": 9440.9273751025
          },
          "total": {
            "nativeFees": {
              "ZAR": 14161.391062653749
            },
            "zarFee": 14161.391062653749
          }
        }
      },
      {
        "id": "gryphon|5521|Globrand Investments (Pty) Ltd",
        "client": "Globrand Investments (Pty) Ltd",
        "accountCode": "5521",
        "identityNo": "1981/004074/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 16278977.84744
        },
        "zarAum": 16278977.84744,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 16278977.84744,
            "zarValue": 16278977.84744
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 3391.4537182166673
            },
            "zarFee": 3391.4537182166673
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 6782.907436433335
            },
            "zarFee": 6782.907436433335
          },
          "total": {
            "nativeFees": {
              "ZAR": 10174.361154650001
            },
            "zarFee": 10174.361154650001
          }
        }
      },
      {
        "id": "gryphon|5276|Grufin Properties (Pty) Ltd",
        "client": "Grufin Properties (Pty) Ltd",
        "accountCode": "5276",
        "identityNo": "1995/005536/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 47495043.573321
        },
        "zarAum": 47495043.573321,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 47495043.573321,
            "zarValue": 47495043.573321
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 9894.800744441874
            },
            "zarFee": 9894.800744441874
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 19789.60148888375
            },
            "zarFee": 19789.60148888375
          },
          "total": {
            "nativeFees": {
              "ZAR": 29684.40223332562
            },
            "zarFee": 29684.40223332562
          }
        }
      },
      {
        "id": "gryphon|5293|Gruzd, Marie",
        "client": "Gruzd, Marie",
        "accountCode": "5293",
        "identityNo": "4610110111186",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 27425445.84611
        },
        "zarAum": 27425445.84611,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 27425445.84611,
            "zarValue": 27425445.84611
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 5713.634551272917
            },
            "zarFee": 5713.634551272917
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 11427.269102545833
            },
            "zarFee": 11427.269102545833
          },
          "total": {
            "nativeFees": {
              "ZAR": 17140.90365381875
            },
            "zarFee": 17140.90365381875
          }
        }
      },
      {
        "id": "gryphon|5264|Gruzd, Wilfred",
        "client": "Gruzd, Wilfred",
        "accountCode": "5264",
        "identityNo": "4201045091089",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 59006210.212287
        },
        "zarAum": 59006210.212287,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 59006210.212287,
            "zarValue": 59006210.212287
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 12292.960460893126
            },
            "zarFee": 12292.960460893126
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 24585.92092178625
            },
            "zarFee": 24585.92092178625
          },
          "total": {
            "nativeFees": {
              "ZAR": 36878.88138267938
            },
            "zarFee": 36878.88138267938
          }
        }
      },
      {
        "id": "gryphon|5369|Hoar, Bianca Leigh",
        "client": "Hoar, Bianca Leigh",
        "accountCode": "5369",
        "identityNo": "9902050064086",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 50743.608263
        },
        "zarAum": 50743.608263,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 50743.608263,
            "zarValue": 50743.608263
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 10.571585054791667
            },
            "zarFee": 10.571585054791667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 21.143170109583334
            },
            "zarFee": 21.143170109583334
          },
          "total": {
            "nativeFees": {
              "ZAR": 31.714755164375
            },
            "zarFee": 31.714755164375
          }
        }
      },
      {
        "id": "gryphon|5006|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "5006",
        "identityNo": "6801105008085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 13208039.175891
        },
        "zarAum": 13208039.175891,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 13208039.175891,
            "zarValue": 13208039.175891
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2751.674828310625
            },
            "zarFee": 2751.674828310625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 5503.34965662125
            },
            "zarFee": 5503.34965662125
          },
          "total": {
            "nativeFees": {
              "ZAR": 8255.024484931875
            },
            "zarFee": 8255.024484931875
          }
        }
      },
      {
        "id": "gryphon|5365|Hoar, Tayla",
        "client": "Hoar, Tayla",
        "accountCode": "5365",
        "identityNo": "9701160063081",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 489.560123
        },
        "zarAum": 489.560123,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 489.560123,
            "zarValue": 489.560123
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 0.10199169229166666
            },
            "zarFee": 0.10199169229166666
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 0.20398338458333332
            },
            "zarFee": 0.20398338458333332
          },
          "total": {
            "nativeFees": {
              "ZAR": 0.305975076875
            },
            "zarFee": 0.305975076875
          }
        }
      },
      {
        "id": "gryphon|4816|Keren, Sara",
        "client": "Keren, Sara",
        "accountCode": "4816",
        "identityNo": "7101120072086",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 21791833.271453
        },
        "zarAum": 21791833.271453,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 21791833.271453,
            "zarValue": 21791833.271453
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 4539.965264886042
            },
            "zarFee": 4539.965264886042
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 9079.930529772084
            },
            "zarFee": 9079.930529772084
          },
          "total": {
            "nativeFees": {
              "ZAR": 13619.895794658125
            },
            "zarFee": 13619.895794658125
          }
        }
      },
      {
        "id": "gryphon|5682|Keurboom Trust",
        "client": "Keurboom Trust",
        "accountCode": "5682",
        "identityNo": "IT3055/2005",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 4014810.072164
        },
        "zarAum": 4014810.072164,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 4014810.072164,
            "zarValue": 4014810.072164
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 836.4187650341668
            },
            "zarFee": 836.4187650341668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1672.8375300683335
            },
            "zarFee": 1672.8375300683335
          },
          "total": {
            "nativeFees": {
              "ZAR": 2509.2562951025
            },
            "zarFee": 2509.2562951025
          }
        }
      },
      {
        "id": "gryphon|7123|Lancaster, Dean",
        "client": "Lancaster, Dean",
        "accountCode": "7123",
        "identityNo": "6710305180083",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 201534.974766
        },
        "zarAum": 201534.974766,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 201534.974766,
            "zarValue": 201534.974766
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 41.98645307625
            },
            "zarFee": 41.98645307625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 83.9729061525
            },
            "zarFee": 83.9729061525
          },
          "total": {
            "nativeFees": {
              "ZAR": 125.95935922875
            },
            "zarFee": 125.95935922875
          }
        }
      },
      {
        "id": "gryphon|5310|Louw, Delia",
        "client": "Louw, Delia",
        "accountCode": "5310",
        "identityNo": "7612160110081",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 28478.475659
        },
        "zarAum": 28478.475659,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 28478.475659,
            "zarValue": 28478.475659
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 5.933015762291667
            },
            "zarFee": 5.933015762291667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 11.866031524583335
            },
            "zarFee": 11.866031524583335
          },
          "total": {
            "nativeFees": {
              "ZAR": 17.799047286875002
            },
            "zarFee": 17.799047286875002
          }
        }
      },
      {
        "id": "gryphon|5020|McGuirk, Pamela",
        "client": "McGuirk, Pamela",
        "accountCode": "5020",
        "identityNo": "5102090073080",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1222111.174598
        },
        "zarAum": 1222111.174598,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 1222111.174598,
            "zarValue": 1222111.174598
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 254.60649470791668
            },
            "zarFee": 254.60649470791668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 509.21298941583336
            },
            "zarFee": 509.21298941583336
          },
          "total": {
            "nativeFees": {
              "ZAR": 763.81948412375
            },
            "zarFee": 763.81948412375
          }
        }
      },
      {
        "id": "gryphon|5503|Robinson, Cheryl",
        "client": "Robinson, Cheryl",
        "accountCode": "5503",
        "identityNo": "7808230246083",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 57168.730646
        },
        "zarAum": 57168.730646,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 57168.730646,
            "zarValue": 57168.730646
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 11.910152217916668
            },
            "zarFee": 11.910152217916668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 23.820304435833336
            },
            "zarFee": 23.820304435833336
          },
          "total": {
            "nativeFees": {
              "ZAR": 35.730456653750004
            },
            "zarFee": 35.730456653750004
          }
        }
      },
      {
        "id": "gryphon|5166|Snitcher, Lauren Renee",
        "client": "Snitcher, Lauren Renee",
        "accountCode": "5166",
        "identityNo": "6012290039089",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 57817.868487
        },
        "zarAum": 57817.868487,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 57817.868487,
            "zarValue": 57817.868487
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 12.045389268125
            },
            "zarFee": 12.045389268125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 24.09077853625
            },
            "zarFee": 24.09077853625
          },
          "total": {
            "nativeFees": {
              "ZAR": 36.136167804375
            },
            "zarFee": 36.136167804375
          }
        }
      },
      {
        "id": "gryphon|5266|Stingray Accessory Manufacturers (Pty) Ltd",
        "client": "Stingray Accessory Manufacturers (Pty) Ltd",
        "accountCode": "5266",
        "identityNo": "2005/004874/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 59482890.226245
        },
        "zarAum": 59482890.226245,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 59482890.226245,
            "zarValue": 59482890.226245
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 12392.268797134377
            },
            "zarFee": 12392.268797134377
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 24784.537594268753
            },
            "zarFee": 24784.537594268753
          },
          "total": {
            "nativeFees": {
              "ZAR": 37176.80639140313
            },
            "zarFee": 37176.80639140313
          }
        }
      },
      {
        "id": "gryphon||Thomas, Mayne",
        "client": "Thomas, Mayne",
        "accountCode": "",
        "identityNo": "8908115051084",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 7041168.283679
        },
        "zarAum": 7041168.283679,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 7041168.283679,
            "zarValue": 7041168.283679
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1466.9100590997916
            },
            "zarFee": 1466.9100590997916
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 2933.8201181995832
            },
            "zarFee": 2933.8201181995832
          },
          "total": {
            "nativeFees": {
              "ZAR": 4400.730177299375
            },
            "zarFee": 4400.730177299375
          }
        }
      },
      {
        "id": "gryphon|5557|Van Niekerk, Ann",
        "client": "Van Niekerk, Ann",
        "accountCode": "5557",
        "identityNo": "4401080053081",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 12336.788759
        },
        "zarAum": 12336.788759,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 12336.788759,
            "zarValue": 12336.788759
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2.5701643247916666
            },
            "zarFee": 2.5701643247916666
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 5.140328649583333
            },
            "zarFee": 5.140328649583333
          },
          "total": {
            "nativeFees": {
              "ZAR": 7.710492974375
            },
            "zarFee": 7.710492974375
          }
        }
      },
      {
        "id": "julius-baer|0316.6598|De Mey, Armelle",
        "client": "De Mey, Armelle",
        "accountCode": "0316.6598",
        "identityNo": "6007020264189",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 7222644.199999999
        },
        "zarAum": 116566254.7438,
        "holdingCount": 6,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 18279.95,
            "zarValue": 295020.11305
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 425569.97,
            "zarValue": 6868273.745829999
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 465791.76,
            "zarValue": 7517413.21464
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 5900478.29,
            "zarValue": 95227819.12231
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 273073.89,
            "zarValue": 4407139.51071
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 139450.34,
            "zarValue": 2250589.0372599997
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 1938.720757537252
            },
            "zarFee": 31289.014305893714
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 3411.171147776779
            },
            "zarFee": 55052.891153969445
          },
          "total": {
            "nativeFees": {
              "USD": 5349.891905314031
            },
            "zarFee": 86341.90545986316
          }
        }
      },
      {
        "id": "julius-baer|0321.7188|De Mey, Katinga",
        "client": "De Mey, Katinga",
        "accountCode": "0321.7188",
        "identityNo": "9606210194085",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 1764000.3299999998
        },
        "zarAum": 28469201.32587,
        "holdingCount": 5,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 85352.87,
            "zarValue": 1377509.96893
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 568990.12,
            "zarValue": 9182931.54668
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 561998.77,
            "zarValue": 9070098.14903
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 405703.14,
            "zarValue": 6547642.97646
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 141955.43,
            "zarValue": 2291018.6847699997
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 473.4975116278831
            },
            "zarFee": 7641.776340162407
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 833.1169117211557
            },
            "zarFee": 13445.673838267734
          },
          "total": {
            "nativeFees": {
              "USD": 1306.6144233490388
            },
            "zarFee": 21087.45017843014
          }
        }
      },
      {
        "id": "julius-baer|0315.2553|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "0315.2553",
        "identityNo": "6801105008085",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 1937782.42
        },
        "zarAum": 31273870.476379998,
        "holdingCount": 9,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 21134.22,
            "zarValue": 341085.17658
          },
          {
            "investment": "Dodge & Cox Worldwide Funds",
            "currency": "USD",
            "nativeValue": 16870.99,
            "zarValue": 272280.90761
          },
          {
            "investment": "Global X Copper Miners ETF",
            "currency": "USD",
            "nativeValue": 71664.45,
            "zarValue": 1156592.55855
          },
          {
            "investment": "Invesco Global Clean Energy ETF",
            "currency": "USD",
            "nativeValue": 13636.13,
            "zarValue": 220073.50207
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1356483.71,
            "zarValue": 21892290.595689997
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 210372.3,
            "zarValue": 3395198.5497
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 139802.19,
            "zarValue": 2256267.54441
          },
          {
            "investment": "Gold",
            "currency": "USD",
            "nativeValue": 39600.55,
            "zarValue": 639113.27645
          },
          {
            "investment": "Prescient China Balanced Fund ",
            "currency": "USD",
            "nativeValue": 68217.88,
            "zarValue": 1100968.36532
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 520.1445477882975
            },
            "zarFee": 8394.612856755333
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 915.1921787554016
            },
            "zarFee": 14770.286572933428
          },
          "total": {
            "nativeFees": {
              "USD": 1435.3367265436991
            },
            "zarFee": 23164.89942968876
          }
        }
      },
      {
        "id": "julius-baer|0316.9089|Hughes, Carol",
        "client": "Hughes, Carol",
        "accountCode": "0316.9089",
        "identityNo": "548451598",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 369315.80000000005
        },
        "zarAum": 5960387.6962,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 323.59,
            "zarValue": 5222.41901
          },
          {
            "investment": "Wealthworks Global Flexible Fund (USD)",
            "currency": "USD",
            "nativeValue": 368992.21,
            "zarValue": 5955165.27719
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 99.13269818087902
            },
            "zarFee": 1599.9026159412062
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 174.42357210093496
            },
            "zarFee": 2815.0220301369886
          },
          "total": {
            "nativeFees": {
              "USD": 273.55627028181397
            },
            "zarFee": 4414.924646078195
          }
        }
      },
      {
        "id": "julius-baer|0315.4230|Keren, Avi & Glynis",
        "client": "Keren, Avi & Glynis",
        "accountCode": "0315.4230",
        "identityNo": "6909305074086",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 1361735.4700000002
        },
        "zarAum": 21977048.75033,
        "holdingCount": 16,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 81430.56,
            "zarValue": 1314207.80784
          },
          {
            "investment": "Bayer AG",
            "currency": "USD",
            "nativeValue": 954.19,
            "zarValue": 15399.672410000001
          },
          {
            "investment": "Alphabet",
            "currency": "USD",
            "nativeValue": 16900.0,
            "zarValue": 272749.1
          },
          {
            "investment": "Apple Inc",
            "currency": "USD",
            "nativeValue": 726544.0,
            "zarValue": 11725693.616
          },
          {
            "investment": "Clorox Co",
            "currency": "USD",
            "nativeValue": 563.95,
            "zarValue": 9101.58905
          },
          {
            "investment": "Fossil Group Inc",
            "currency": "USD",
            "nativeValue": 31212.65,
            "zarValue": 503740.95835000003
          },
          {
            "investment": "Global X Artifical Intelligence & Technology ETF",
            "currency": "USD",
            "nativeValue": 10394.0,
            "zarValue": 167748.766
          },
          {
            "investment": "Intel Corp",
            "currency": "USD",
            "nativeValue": 1672.92,
            "zarValue": 26999.25588
          },
          {
            "investment": "Invesco QQQ Trust Series",
            "currency": "USD",
            "nativeValue": 9328.05,
            "zarValue": 150545.39894999997
          },
          {
            "investment": "Meta Platforms Inc",
            "currency": "USD",
            "nativeValue": 7165.0,
            "zarValue": 115635.935
          },
          {
            "investment": "Microsoft Corp",
            "currency": "USD",
            "nativeValue": 6884.64,
            "zarValue": 111111.20496
          },
          {
            "investment": "Paypal Holdings Inc",
            "currency": "USD",
            "nativeValue": 368.83,
            "zarValue": 5952.547369999999
          },
          {
            "investment": "Tesla Inc",
            "currency": "USD",
            "nativeValue": 45193.05,
            "zarValue": 729370.63395
          },
          {
            "investment": "Tripadvisor Inc",
            "currency": "USD",
            "nativeValue": 970.17,
            "zarValue": 15657.573629999999
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 391006.96,
            "zarValue": 6310461.32744
          },
          {
            "investment": "Gold",
            "currency": "USD",
            "nativeValue": 31146.5,
            "zarValue": 502673.3635
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 365.520541903995
            },
            "zarFee": 5899.136025788575
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 643.1318804501338
            },
            "zarFee": 10379.50541858471
          },
          "total": {
            "nativeFees": {
              "USD": 1008.6524223541289
            },
            "zarFee": 16278.641444373285
          }
        }
      },
      {
        "id": "julius-baer|0321.5916|Marula Trading & Investments Limited",
        "client": "Marula Trading & Investments Limited",
        "accountCode": "0321.5916",
        "identityNo": "70414",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 4369898.5600000005
        },
        "zarAum": 70525792.85984,
        "holdingCount": 9,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 10504.29,
            "zarValue": 169528.73631
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 14793.02,
            "zarValue": 238744.54978
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 45314.35,
            "zarValue": 731328.2946499999
          },
          {
            "investment": "Meituan",
            "currency": "USD",
            "nativeValue": 6521.69,
            "zarValue": 105253.55490999999
          },
          {
            "investment": "Tencent Holdings Limited",
            "currency": "USD",
            "nativeValue": 406598.9,
            "zarValue": 6562099.6471
          },
          {
            "investment": "Alibaba Group Holding",
            "currency": "USD",
            "nativeValue": 156843.0,
            "zarValue": 2531289.1769999997
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1639599.96,
            "zarValue": 26461503.75444
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 646726.27,
            "zarValue": 10437515.27153
          },
          {
            "investment": "Xhaos Special Opportunities Fund D",
            "currency": "USD",
            "nativeValue": 1442997.08,
            "zarValue": 23288529.87412
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 1172.9794258180611
            },
            "zarFee": 18930.714953277686
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 2063.85244431441
            },
            "zarFee": 33308.514598790265
          },
          "total": {
            "nativeFees": {
              "USD": 3236.8318701324715
            },
            "zarFee": 52239.22955206795
          }
        }
      },
      {
        "id": "julius-baer|0319.4475|Terra-Mater Limited",
        "client": "Terra-Mater Limited",
        "accountCode": "0319.4475",
        "identityNo": "56121 C2/GBL",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 3518729.8500000006
        },
        "zarAum": 56788781.04915,
        "holdingCount": 5,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 9559.4,
            "zarValue": 154279.1566
          },
          {
            "investment": "Scottish Mortgage Investment Trust",
            "currency": "USD",
            "nativeValue": 198418.19,
            "zarValue": 3202271.16841
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1209675.16,
            "zarValue": 19522947.40724
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 693351.28,
            "zarValue": 11189996.30792
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 1407725.82,
            "zarValue": 22719287.00898
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 944.5065285592973
            },
            "zarFee": 15243.390864418498
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 1661.8553273247098
            },
            "zarFee": 26820.683127693486
          },
          "total": {
            "nativeFees": {
              "USD": 2606.361855884007
            },
            "zarFee": 42064.07399211198
          }
        }
      },
      {
        "id": "northstar-fnb|1003725|Fallows, Christopher",
        "client": "Fallows, Christopher",
        "accountCode": "1003725",
        "identityNo": "7209215223082",
        "providerId": "northstar-fnb",
        "providerName": "Northstar FNB",
        "nativeValues": {
          "USD": 533550.59
        },
        "zarAum": 8610972.97201,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "FNB Securities Trading Account (Northstar)",
            "currency": "USD",
            "nativeValue": 533550.59,
            "zarValue": 8610972.97201
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "USD": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "USD": 222.31274583333334
            },
            "zarFee": 3587.905405004167
          },
          "total": {
            "nativeFees": {
              "USD": 222.31274583333334
            },
            "zarFee": 3587.905405004167
          }
        }
      },
      {
        "id": "northstar-sanlam||Fowler, Merle",
        "client": "Fowler, Merle",
        "accountCode": "",
        "identityNo": "5202120048084",
        "providerId": "northstar-sanlam",
        "providerName": "Northstar Sanlam",
        "nativeValues": {
          "ZAR": 3007494.02
        },
        "zarAum": 3007494.02,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Northstar SCI Managed Fund",
            "currency": "ZAR",
            "nativeValue": 3007494.02,
            "zarValue": 3007494.02
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "ZAR": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1253.1225083333334
            },
            "zarFee": 1253.1225083333334
          },
          "total": {
            "nativeFees": {
              "ZAR": 1253.1225083333334
            },
            "zarFee": 1253.1225083333334
          }
        }
      },
      {
        "id": "peresec|197970|Keren, Sara",
        "client": "Keren, Sara",
        "accountCode": "197970",
        "identityNo": "7101120072086",
        "providerId": "peresec",
        "providerName": "Peresec",
        "nativeValues": {
          "ZAR": 3333644.92
        },
        "zarAum": 3333644.92,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Peresec Trading Account",
            "currency": "ZAR",
            "nativeValue": 3333644.92,
            "zarValue": 3333644.92
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "ZAR": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1389.0187166666667
            },
            "zarFee": 1389.0187166666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 1389.0187166666667
            },
            "zarFee": 1389.0187166666667
          }
        }
      },
      {
        "id": "prescient||Commercial Buildings (Pty) Ltd",
        "client": "Commercial Buildings (Pty) Ltd",
        "accountCode": "",
        "identityNo": "1927/000221/07",
        "providerId": "prescient",
        "providerName": "Prescient",
        "nativeValues": {
          "ZAR": 42467993.31
        },
        "zarAum": 42467993.31,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Laurium Stable Prescient Fund A2",
            "currency": "ZAR",
            "nativeValue": 42467993.31,
            "zarValue": 42467993.31
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "ZAR": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 17694.997212500002
            },
            "zarFee": 17694.997212500002
          },
          "total": {
            "nativeFees": {
              "ZAR": 17694.997212500002
            },
            "zarFee": 17694.997212500002
          }
        }
      },
      {
        "id": "prime|PRI50594441|Apex Holdings (Pty) Ltd",
        "client": "Apex Holdings (Pty) Ltd",
        "accountCode": "PRI50594441",
        "identityNo": "2015/068524/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 6762949.130000001
        },
        "zarAum": 6762949.130000001,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Centaur BCI Flexible Fund ( C )",
            "currency": "ZAR",
            "nativeValue": 309751.73,
            "zarValue": 309751.73
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 6453197.4,
            "zarValue": 6453197.4
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1408.9477354166668
            },
            "zarFee": 1408.9477354166668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 2817.8954708333335
            },
            "zarFee": 2817.8954708333335
          },
          "total": {
            "nativeFees": {
              "ZAR": 4226.843206250001
            },
            "zarFee": 4226.843206250001
          }
        }
      },
      {
        "id": "prime|PRI202110280001|Blackbeard, Ginette",
        "client": "Blackbeard, Ginette",
        "accountCode": "PRI202110280001",
        "identityNo": "8002160132088",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 853609.42
        },
        "zarAum": 853609.42,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 53484.87,
            "zarValue": 53484.87
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 799748.28,
            "zarValue": 799748.28
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 376.27,
            "zarValue": 376.27
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 177.83529583333336
            },
            "zarFee": 177.83529583333336
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 355.6705916666667
            },
            "zarFee": 355.6705916666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 533.5058875000001
            },
            "zarFee": 533.5058875000001
          }
        }
      },
      {
        "id": "prime|PRI202212210002|Commercial Buildings (Pty) Ltd",
        "client": "Commercial Buildings (Pty) Ltd",
        "accountCode": "PRI202212210002",
        "identityNo": "1927/000221/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 38407360.54
        },
        "zarAum": 38407360.54,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 38407360.54,
            "zarValue": 38407360.54
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 8001.533445833334
            },
            "zarFee": 8001.533445833334
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 16003.066891666667
            },
            "zarFee": 16003.066891666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 24004.6003375
            },
            "zarFee": 24004.6003375
          }
        }
      },
      {
        "id": "prime|PRI201806040001|De Mey, Armelle",
        "client": "De Mey, Armelle",
        "accountCode": "PRI201806040001",
        "identityNo": "6007020264189",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1563936.92
        },
        "zarAum": 1563936.92,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1563936.92,
            "zarValue": 1563936.92
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 325.82019166666663
            },
            "zarFee": 325.82019166666663
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 651.6403833333333
            },
            "zarFee": 651.6403833333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 977.4605749999998
            },
            "zarFee": 977.4605749999998
          }
        }
      },
      {
        "id": "prime|PRI201908270001|De Mey, Katinga",
        "client": "De Mey, Katinga",
        "accountCode": "PRI201908270001",
        "identityNo": "9606210194085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 356196.64
        },
        "zarAum": 356196.64,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 356196.64,
            "zarValue": 356196.64
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 74.20763333333333
            },
            "zarFee": 74.20763333333333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 148.41526666666667
            },
            "zarFee": 148.41526666666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 222.62290000000002
            },
            "zarFee": 222.62290000000002
          }
        }
      },
      {
        "id": "prime|PRI202212050001|Eskinazi, Ray",
        "client": "Eskinazi, Ray",
        "accountCode": "PRI202212050001",
        "identityNo": "5708225780082",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2582175.93
        },
        "zarAum": 2582175.93,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 2582175.93,
            "zarValue": 2582175.93
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 537.95331875
            },
            "zarFee": 537.95331875
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1075.9066375
            },
            "zarFee": 1075.9066375
          },
          "total": {
            "nativeFees": {
              "ZAR": 1613.8599562499999
            },
            "zarFee": 1613.8599562499999
          }
        }
      },
      {
        "id": "prime|PRI201803280003|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "PRI201803280003",
        "identityNo": "6510245060084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7666453.37
        },
        "zarAum": 7666453.37,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Preservation Pension Plan)",
            "currency": "ZAR",
            "nativeValue": 7666453.37,
            "zarValue": 7666453.37
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1597.1777854166667
            },
            "zarFee": 1597.1777854166667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3194.3555708333333
            },
            "zarFee": 3194.3555708333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 4791.53335625
            },
            "zarFee": 4791.53335625
          }
        }
      },
      {
        "id": "prime|PRI201911150005|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "PRI201911150005",
        "identityNo": "6510245060084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 873171.04
        },
        "zarAum": 873171.04,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Retirement Plan)",
            "currency": "ZAR",
            "nativeValue": 873171.04,
            "zarValue": 873171.04
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 181.91063333333332
            },
            "zarFee": 181.91063333333332
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 363.82126666666665
            },
            "zarFee": 363.82126666666665
          },
          "total": {
            "nativeFees": {
              "ZAR": 545.7319
            },
            "zarFee": 545.7319
          }
        }
      },
      {
        "id": "prime|PRI202012090001|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "PRI202012090001",
        "identityNo": "6510245060084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 356714.08
        },
        "zarAum": 356714.08,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Preservation Provident Plan)",
            "currency": "ZAR",
            "nativeValue": 356714.08,
            "zarValue": 356714.08
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 74.31543333333333
            },
            "zarFee": 74.31543333333333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 148.63086666666666
            },
            "zarFee": 148.63086666666666
          },
          "total": {
            "nativeFees": {
              "ZAR": 222.9463
            },
            "zarFee": 222.9463
          }
        }
      },
      {
        "id": "prime|PRI202008120001|Fallows, Monique Louise",
        "client": "Fallows, Monique Louise",
        "accountCode": "PRI202008120001",
        "identityNo": "7901040119085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7344831.17
        },
        "zarAum": 7344831.17,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "36ONE Flexible",
            "currency": "ZAR",
            "nativeValue": 310113.96,
            "zarValue": 310113.96
          },
          {
            "investment": "Fairtree Equity Prescient Fund (A1) ",
            "currency": "ZAR",
            "nativeValue": 375938.82,
            "zarValue": 375938.82
          },
          {
            "investment": "Centaur BCI Flexible Fund ( C )",
            "currency": "ZAR",
            "nativeValue": 303990.04,
            "zarValue": 303990.04
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 6354788.35,
            "zarValue": 6354788.35
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1530.1731604166669
            },
            "zarFee": 1530.1731604166669
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3060.3463208333337
            },
            "zarFee": 3060.3463208333337
          },
          "total": {
            "nativeFees": {
              "ZAR": 4590.51948125
            },
            "zarFee": 4590.51948125
          }
        }
      },
      {
        "id": "prime|PRI202110110005|Fowler, Merle",
        "client": "Fowler, Merle",
        "accountCode": "PRI202110110005",
        "identityNo": "5202120048084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1154273.1400000001
        },
        "zarAum": 1154273.1400000001,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 276306.55,
            "zarValue": 276306.55
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 877815.97,
            "zarValue": 877815.97
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 150.62,
            "zarValue": 150.62
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 240.47357083333338
            },
            "zarFee": 240.47357083333338
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 480.94714166666677
            },
            "zarFee": 480.94714166666677
          },
          "total": {
            "nativeFees": {
              "ZAR": 721.4207125000001
            },
            "zarFee": 721.4207125000001
          }
        }
      },
      {
        "id": "prime|PRI202308310001|Gennari Family Trust",
        "client": "Gennari Family Trust",
        "accountCode": "PRI202308310001",
        "identityNo": "IT000218/2022(C)",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2867665.64
        },
        "zarAum": 2867665.64,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 1131949.63,
            "zarValue": 1131949.63
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1671325.88,
            "zarValue": 1671325.88
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 63992.41,
            "zarValue": 63992.41
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 397.72,
            "zarValue": 397.72
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 597.4303416666668
            },
            "zarFee": 597.4303416666668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1194.8606833333336
            },
            "zarFee": 1194.8606833333336
          },
          "total": {
            "nativeFees": {
              "ZAR": 1792.2910250000004
            },
            "zarFee": 1792.2910250000004
          }
        }
      },
      {
        "id": "prime|PRI202450599542|Hedley, James",
        "client": "Hedley, James",
        "accountCode": "PRI202450599542",
        "identityNo": "8405255864186",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1647691.89
        },
        "zarAum": 1647691.89,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1647691.89,
            "zarValue": 1647691.89
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 343.26914375
            },
            "zarFee": 343.26914375
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 686.5382875
            },
            "zarFee": 686.5382875
          },
          "total": {
            "nativeFees": {
              "ZAR": 1029.80743125
            },
            "zarFee": 1029.80743125
          }
        }
      },
      {
        "id": "prime|PRI201802280001|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "PRI201802280001",
        "identityNo": "6801105008085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2391539.52
        },
        "zarAum": 2391539.52,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Retirement Plan)",
            "currency": "ZAR",
            "nativeValue": 2391539.52,
            "zarValue": 2391539.52
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 498.2374
            },
            "zarFee": 498.2374
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 996.4748
            },
            "zarFee": 996.4748
          },
          "total": {
            "nativeFees": {
              "ZAR": 1494.7122
            },
            "zarFee": 1494.7122
          }
        }
      },
      {
        "id": "prime|PRI201807090001|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "PRI201807090001",
        "identityNo": "6801105008085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7239193.55
        },
        "zarAum": 7239193.55,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Investment Plan)",
            "currency": "ZAR",
            "nativeValue": 7239193.55,
            "zarValue": 7239193.55
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1508.1653229166668
            },
            "zarFee": 1508.1653229166668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3016.3306458333336
            },
            "zarFee": 3016.3306458333336
          },
          "total": {
            "nativeFees": {
              "ZAR": 4524.49596875
            },
            "zarFee": 4524.49596875
          }
        }
      },
      {
        "id": "prime|PRI202108240002|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "PRI202108240002",
        "identityNo": "6801105008085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 40763653.95
        },
        "zarAum": 40763653.95,
        "holdingCount": 9,
        "holdings": [
          {
            "investment": "Fairtree Equity Prescient (A1)",
            "currency": "ZAR",
            "nativeValue": 1567799.79,
            "zarValue": 1567799.79
          },
          {
            "investment": "ClucasGray Prescient Equity Fund (B1)",
            "currency": "ZAR",
            "nativeValue": 1483650.1,
            "zarValue": 1483650.1
          },
          {
            "investment": "Laurium Flexible Prescient Fund Fund (B4)",
            "currency": "ZAR",
            "nativeValue": 1364808.09,
            "zarValue": 1364808.09
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 8914120.16,
            "zarValue": 8914120.16
          },
          {
            "investment": "36One Bci Flexible Opportunity Fund (A)",
            "currency": "ZAR",
            "nativeValue": 1430622.36,
            "zarValue": 1430622.36
          },
          {
            "investment": "Centaur Bci Flexible Fund (C)",
            "currency": "ZAR",
            "nativeValue": 1717089.68,
            "zarValue": 1717089.68
          },
          {
            "investment": "Obsidian SCI Equity Fund (B3)",
            "currency": "ZAR",
            "nativeValue": 1494632.96,
            "zarValue": 1494632.96
          },
          {
            "investment": "Coronation Global Emerging Markets Flexible (P)",
            "currency": "ZAR",
            "nativeValue": 1204592.42,
            "zarValue": 1204592.42
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Investment Plan)",
            "currency": "ZAR",
            "nativeValue": 21586338.39,
            "zarValue": 21586338.39
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 8492.42790625
            },
            "zarFee": 8492.42790625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 16984.8558125
            },
            "zarFee": 16984.8558125
          },
          "total": {
            "nativeFees": {
              "ZAR": 25477.283718750004
            },
            "zarFee": 25477.283718750004
          }
        }
      },
      {
        "id": "prime|PRI202450595140|Kovacs Investments 492 (PTY) LTD",
        "client": "Kovacs Investments 492 (PTY) LTD",
        "accountCode": "PRI202450595140",
        "identityNo": "2002/006975/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 11624658.77
        },
        "zarAum": 11624658.77,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Prescient Income Provider (A2)",
            "currency": "ZAR",
            "nativeValue": 1500731.7,
            "zarValue": 1500731.7
          },
          {
            "investment": "Laurium Stable Prescient Fund (A2)",
            "currency": "ZAR",
            "nativeValue": 4351959.99,
            "zarValue": 4351959.99
          },
          {
            "investment": "Wealthworks Prime Cautious FOF (B)",
            "currency": "ZAR",
            "nativeValue": 5771761.74,
            "zarValue": 5771761.74
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 205.34,
            "zarValue": 205.34
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2421.803910416667
            },
            "zarFee": 2421.803910416667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 4843.607820833334
            },
            "zarFee": 4843.607820833334
          },
          "total": {
            "nativeFees": {
              "ZAR": 7265.41173125
            },
            "zarFee": 7265.41173125
          }
        }
      },
      {
        "id": "prime|PRI202301230001|Louw, Delia",
        "client": "Louw, Delia",
        "accountCode": "PRI202301230001",
        "identityNo": "7612160110081",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1759840.43
        },
        "zarAum": 1759840.43,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1759840.43,
            "zarValue": 1759840.43
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 366.63342291666663
            },
            "zarFee": 366.63342291666663
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 733.2668458333333
            },
            "zarFee": 733.2668458333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 1099.90026875
            },
            "zarFee": 1099.90026875
          }
        }
      },
      {
        "id": "prime|PRI202202070007|Mackay Davidson, Charles Stuart",
        "client": "Mackay Davidson, Charles Stuart",
        "accountCode": "PRI202202070007",
        "identityNo": "6701275028089",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 641317.7000000001
        },
        "zarAum": 641317.7000000001,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 6683.93,
            "zarValue": 6683.93
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 634511.49,
            "zarValue": 634511.49
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 122.28,
            "zarValue": 122.28
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 133.60785416666667
            },
            "zarFee": 133.60785416666667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 267.21570833333334
            },
            "zarFee": 267.21570833333334
          },
          "total": {
            "nativeFees": {
              "ZAR": 400.8235625
            },
            "zarFee": 400.8235625
          }
        }
      },
      {
        "id": "prime|PRI201911110003|Mandy, Shelley Anne",
        "client": "Mandy, Shelley Anne",
        "accountCode": "PRI201911110003",
        "identityNo": "6211080127084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 8172057.18
        },
        "zarAum": 8172057.18,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 8171622.88,
            "zarValue": 8171622.88
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 434.3,
            "zarValue": 434.3
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1702.5119125
            },
            "zarFee": 1702.5119125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3405.023825
            },
            "zarFee": 3405.023825
          },
          "total": {
            "nativeFees": {
              "ZAR": 5107.5357375
            },
            "zarFee": 5107.5357375
          }
        }
      },
      {
        "id": "prime|PRI202550601174|Moyo, Thithibele",
        "client": "Moyo, Thithibele",
        "accountCode": "PRI202550601174",
        "identityNo": "FN497554",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 13062.06
        },
        "zarAum": 13062.06,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 13062.06,
            "zarValue": 13062.06
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2.7212625
            },
            "zarFee": 2.7212625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 5.442525
            },
            "zarFee": 5.442525
          },
          "total": {
            "nativeFees": {
              "ZAR": 8.1637875
            },
            "zarFee": 8.1637875
          }
        }
      },
      {
        "id": "prime|PRI202103150001|Robinson, Cheryl",
        "client": "Robinson, Cheryl",
        "accountCode": "PRI202103150001",
        "identityNo": "7808230246083",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 119528.45
        },
        "zarAum": 119528.45,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 119528.45,
            "zarValue": 119528.45
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 24.901760416666665
            },
            "zarFee": 24.901760416666665
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 49.80352083333333
            },
            "zarFee": 49.80352083333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 74.70528125
            },
            "zarFee": 74.70528125
          }
        }
      },
      {
        "id": "prime|PRI202209280001|Smuts, Hanny",
        "client": "Smuts, Hanny",
        "accountCode": "PRI202209280001",
        "identityNo": "5306120097080",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1471874.1
        },
        "zarAum": 1471874.1,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Matrix SCI Stable Income Fund B1",
            "currency": "ZAR",
            "nativeValue": 218299.77,
            "zarValue": 218299.77
          },
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 221721.82,
            "zarValue": 221721.82
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1031326.18,
            "zarValue": 1031326.18
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 526.33,
            "zarValue": 526.33
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 306.6404375
            },
            "zarFee": 306.6404375
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 613.280875
            },
            "zarFee": 613.280875
          },
          "total": {
            "nativeFees": {
              "ZAR": 919.9213125000001
            },
            "zarFee": 919.9213125000001
          }
        }
      },
      {
        "id": "prime|PRI201903150001|Snitcher, Lauren Renee",
        "client": "Snitcher, Lauren Renee",
        "accountCode": "PRI201903150001",
        "identityNo": "6012290039089",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7941703.94
        },
        "zarAum": 7941703.94,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 11.36,
            "zarValue": 11.36
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 7940879.33,
            "zarValue": 7940879.33
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 813.25,
            "zarValue": 813.25
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1654.5216541666668
            },
            "zarFee": 1654.5216541666668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3309.0433083333337
            },
            "zarFee": 3309.0433083333337
          },
          "total": {
            "nativeFees": {
              "ZAR": 4963.564962500001
            },
            "zarFee": 4963.564962500001
          }
        }
      },
      {
        "id": "prime|PRI202204040004|Sweet Grass Trading 12 (Pty) Ltd",
        "client": "Sweet Grass Trading 12 (Pty) Ltd",
        "accountCode": "PRI202204040004",
        "identityNo": "2008/025068/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 44901484.97
        },
        "zarAum": 44901484.97,
        "holdingCount": 6,
        "holdings": [
          {
            "investment": "36One BCI Global Equity Feeder Fund (A) (36FNDA)",
            "currency": "ZAR",
            "nativeValue": 4257579.22,
            "zarValue": 4257579.22
          },
          {
            "investment": "Catalyst SCI Global Real Estate SCI Feeder (B) (CGRE)",
            "currency": "ZAR",
            "nativeValue": 2625600.89,
            "zarValue": 2625600.89
          },
          {
            "investment": "Centaur Bci Flexible Fund ( C )",
            "currency": "ZAR",
            "nativeValue": 648434.81,
            "zarValue": 648434.81
          },
          {
            "investment": "ClucasGray Prescient Equity Fund (B1) (CGPB1)",
            "currency": "ZAR",
            "nativeValue": 717536.16,
            "zarValue": 717536.16
          },
          {
            "investment": "Coronation Global Emerging Markets Flexible [ZAR] Fund (P) (CGEMB4)",
            "currency": "ZAR",
            "nativeValue": 8122430.4,
            "zarValue": 8122430.4
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 28529903.49,
            "zarValue": 28529903.49
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 9354.476035416666
            },
            "zarFee": 9354.476035416666
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 18708.952070833333
            },
            "zarFee": 18708.952070833333
          },
          "total": {
            "nativeFees": {
              "ZAR": 28063.42810625
            },
            "zarFee": 28063.42810625
          }
        }
      },
      {
        "id": "prime|PRI202450595273|Sweet Grass Trading 12 Acc 2",
        "client": "Sweet Grass Trading 12 Acc 2",
        "accountCode": "PRI202450595273",
        "identityNo": "2008/025068/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 4036129.21
        },
        "zarAum": 4036129.21,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Laurium Stable Prescient Fund (A2)",
            "currency": "ZAR",
            "nativeValue": 481366.58,
            "zarValue": 481366.58
          },
          {
            "investment": "Wealthworks Prime Managed FOF (A)",
            "currency": "ZAR",
            "nativeValue": 2768442.47,
            "zarValue": 2768442.47
          },
          {
            "investment": "Centaur Bci Flexible Fund (C)",
            "currency": "ZAR",
            "nativeValue": 463330.55,
            "zarValue": 463330.55
          },
          {
            "investment": "36One Bci Flexible Opportunity Fund (A)",
            "currency": "ZAR",
            "nativeValue": 322989.61,
            "zarValue": 322989.61
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 840.8602520833333
            },
            "zarFee": 840.8602520833333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1681.7205041666666
            },
            "zarFee": 1681.7205041666666
          },
          "total": {
            "nativeFees": {
              "ZAR": 2522.58075625
            },
            "zarFee": 2522.58075625
          }
        }
      },
      {
        "id": "prime|PRI202110190002|Three Sisters Trust",
        "client": "Three Sisters Trust",
        "accountCode": "PRI202110190002",
        "identityNo": "IT4597/98",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1629392.37
        },
        "zarAum": 1629392.37,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1629392.37,
            "zarValue": 1629392.37
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 339.45674375000004
            },
            "zarFee": 339.45674375000004
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 678.9134875000001
            },
            "zarFee": 678.9134875000001
          },
          "total": {
            "nativeFees": {
              "ZAR": 1018.3702312500002
            },
            "zarFee": 1018.3702312500002
          }
        }
      },
      {
        "id": "prime|PRI202111020001|Van Niekerk, Ann",
        "client": "Van Niekerk, Ann",
        "accountCode": "PRI202111020001",
        "identityNo": "4401080053081",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 507015.27999999997
        },
        "zarAum": 507015.27999999997,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 506627.42,
            "zarValue": 506627.42
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 387.86,
            "zarValue": 387.86
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 105.62818333333333
            },
            "zarFee": 105.62818333333333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 211.25636666666665
            },
            "zarFee": 211.25636666666665
          },
          "total": {
            "nativeFees": {
              "ZAR": 316.88455
            },
            "zarFee": 316.88455
          }
        }
      },
      {
        "id": "prime|PRI201811080002|Von Arnim, Achim Alard Giselher",
        "client": "Von Arnim, Achim Alard Giselher",
        "accountCode": "PRI201811080002",
        "identityNo": "4507195061080",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2204015.46
        },
        "zarAum": 2204015.46,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 2203963.58,
            "zarValue": 2203963.58
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 51.88,
            "zarValue": 51.88
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 459.1698875
            },
            "zarFee": 459.1698875
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 918.339775
            },
            "zarFee": 918.339775
          },
          "total": {
            "nativeFees": {
              "ZAR": 1377.5096625
            },
            "zarFee": 1377.5096625
          }
        }
      },
      {
        "id": "prime|PRI201811080003|Von Arnim, Helga Hildegard Katharina",
        "client": "Von Arnim, Helga Hildegard Katharina",
        "accountCode": "PRI201811080003",
        "identityNo": "5004210080187",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1664571.27
        },
        "zarAum": 1664571.27,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1664453.03,
            "zarValue": 1664453.03
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 118.24,
            "zarValue": 118.24
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 346.78568125
            },
            "zarFee": 346.78568125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 693.5713625
            },
            "zarFee": 693.5713625
          },
          "total": {
            "nativeFees": {
              "ZAR": 1040.35704375
            },
            "zarFee": 1040.35704375
          }
        }
      },
      {
        "id": "prime|PRI202450595137|Wilmans, Joshua",
        "client": "Wilmans, Joshua",
        "accountCode": "PRI202450595137",
        "identityNo": "0406055186083",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 45811.520000000004
        },
        "zarAum": 45811.520000000004,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Coronation Global Emerging Markets Flexible (P)",
            "currency": "ZAR",
            "nativeValue": 10609.62,
            "zarValue": 10609.62
          },
          {
            "investment": "Wealthworks Prime Managed FOF (A)",
            "currency": "ZAR",
            "nativeValue": 24184.0,
            "zarValue": 24184.0
          },
          {
            "investment": "Centaur Bci Flexible Fund (C)",
            "currency": "ZAR",
            "nativeValue": 11017.9,
            "zarValue": 11017.9
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 9.544066666666668
            },
            "zarFee": 9.544066666666668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 19.088133333333335
            },
            "zarFee": 19.088133333333335
          },
          "total": {
            "nativeFees": {
              "ZAR": 28.632200000000005
            },
            "zarFee": 28.632200000000005
          }
        }
      },
      {
        "id": "prime|PRI202204040005|Worrall, Charlie Christopher",
        "client": "Worrall, Charlie Christopher",
        "accountCode": "PRI202204040005",
        "identityNo": "1904295838082",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1131172.47
        },
        "zarAum": 1131172.47,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1131172.47,
            "zarValue": 1131172.47
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 235.66093125
            },
            "zarFee": 235.66093125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 471.3218625
            },
            "zarFee": 471.3218625
          },
          "total": {
            "nativeFees": {
              "ZAR": 706.98279375
            },
            "zarFee": 706.98279375
          }
        }
      },
      {
        "id": "prime|PRI202204040006|Worrall, Isla Elizabeth",
        "client": "Worrall, Isla Elizabeth",
        "accountCode": "PRI202204040006",
        "identityNo": "1709010893084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2750486.82
        },
        "zarAum": 2750486.82,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 2750486.82,
            "zarValue": 2750486.82
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 573.0180875
            },
            "zarFee": 573.0180875
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1146.036175
            },
            "zarFee": 1146.036175
          },
          "total": {
            "nativeFees": {
              "ZAR": 1719.0542624999998
            },
            "zarFee": 1719.0542624999998
          }
        }
      }
    ]
  },
  {
    "id": "feb-2026",
    "label": "Feb 2026",
    "sourceFile": "feb.xlsx",
    "exchangeRates": {
      "USD": 15.9394,
      "ZAR": 1
    },
    "sourceNativeTotals": {
      "USD": 32856697.67000001,
      "ZAR": 633554170.606682
    },
    "sourceZarTotals": {
      "USD": 523716046.84119815,
      "ZAR": 633554170.606682
    },
    "sourceZarTotal": 1157270217.44788,
    "providerSourceTotals": {},
    "clients": [
      {
        "id": "credo|10012899|Blackbeard, Ginette",
        "client": "Blackbeard, Ginette",
        "accountCode": "10012899",
        "identityNo": "8002160132088",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 179207.0
        },
        "zarAum": 2856452.0557999997,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1058.0,
            "zarValue": 16863.8852
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 178149.0,
            "zarValue": 2839588.1706
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 44.80175
            },
            "zarFee": 714.11301395
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 89.6035
            },
            "zarFee": 1428.2260279
          },
          "total": {
            "nativeFees": {
              "USD": 134.40525
            },
            "zarFee": 2142.33904185
          }
        }
      },
      {
        "id": "credo|10016497|Chin, Ashley",
        "client": "Chin, Ashley",
        "accountCode": "10016497",
        "identityNo": "7403295134083",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 118407.0
        },
        "zarAum": 1887336.5358,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 678.0,
            "zarValue": 10806.913199999999
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 117729.0,
            "zarValue": 1876529.6226
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 29.60175
            },
            "zarFee": 471.83413395
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 59.2035
            },
            "zarFee": 943.6682679
          },
          "total": {
            "nativeFees": {
              "USD": 88.80525
            },
            "zarFee": 1415.50240185
          }
        }
      },
      {
        "id": "credo|10023274|Conder, Andrew",
        "client": "Conder, Andrew",
        "accountCode": "10023274",
        "identityNo": "7112126465182",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 378367.0
        },
        "zarAum": 6030942.959799999,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 3644.0,
            "zarValue": 58083.173599999995
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 193615.0,
            "zarValue": 3086106.931
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 117602.0,
            "zarValue": 1874505.3188
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 63506.0,
            "zarValue": 1012247.5364
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 94.59175
            },
            "zarFee": 1507.73573995
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 189.1835
            },
            "zarFee": 3015.4714799
          },
          "total": {
            "nativeFees": {
              "USD": 283.77525
            },
            "zarFee": 4523.20721985
          }
        }
      },
      {
        "id": "credo|10015189|Diva Trust",
        "client": "Diva Trust",
        "accountCode": "10015189",
        "identityNo": "10015189",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 307330.0
        },
        "zarAum": 4898655.801999999,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1428.0,
            "zarValue": 22761.4632
          },
          {
            "investment": "Harmony Capital Limited Special Situations Class",
            "currency": "USD",
            "nativeValue": 2756.0,
            "zarValue": 43928.986399999994
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 303146.0,
            "zarValue": 4831965.352399999
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 76.8325
            },
            "zarFee": 1224.6639504999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 153.665
            },
            "zarFee": 2449.3279009999997
          },
          "total": {
            "nativeFees": {
              "USD": 230.4975
            },
            "zarFee": 3673.9918514999995
          }
        }
      },
      {
        "id": "credo|10015188|Divaris, Belle Norma",
        "client": "Divaris, Belle Norma",
        "accountCode": "10015188",
        "identityNo": "5407090212087",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 48307.0
        },
        "zarAum": 769984.5958,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 480.0,
            "zarValue": 7650.911999999999
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 47827.0,
            "zarValue": 762333.6838
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 12.076749999999999
            },
            "zarFee": 192.49614895000002
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 24.153499999999998
            },
            "zarFee": 384.99229790000004
          },
          "total": {
            "nativeFees": {
              "USD": 36.23025
            },
            "zarFee": 577.4884468500001
          }
        }
      },
      {
        "id": "credo|10006632|Fallows, Christopher & Monique",
        "client": "Fallows, Christopher & Monique",
        "accountCode": "10006632",
        "identityNo": "7209215223082",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 1576682.0
        },
        "zarAum": 25131365.0708,
        "holdingCount": 11,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 11991.0,
            "zarValue": 191129.3454
          },
          {
            "investment": "Volkswagen AG",
            "currency": "USD",
            "nativeValue": 11198.0,
            "zarValue": 178489.4012
          },
          {
            "investment": "Fundsmith Equity Fund",
            "currency": "USD",
            "nativeValue": 123215.0,
            "zarValue": 1963973.1709999999
          },
          {
            "investment": "Scottish Mortgage Investment Trust",
            "currency": "USD",
            "nativeValue": 45464.0,
            "zarValue": 724668.8816
          },
          {
            "investment": "HG Capital Trust",
            "currency": "USD",
            "nativeValue": 17744.0,
            "zarValue": 282828.71359999996
          },
          {
            "investment": "Invesco Solar ETF",
            "currency": "USD",
            "nativeValue": 37850.0,
            "zarValue": 603306.2899999999
          },
          {
            "investment": "iShares Global Tech ETF",
            "currency": "USD",
            "nativeValue": 150653.0,
            "zarValue": 2401318.4282
          },
          {
            "investment": "Jinkosolar Holding Co Ltd",
            "currency": "USD",
            "nativeValue": 43609.0,
            "zarValue": 695101.2945999999
          },
          {
            "investment": "Kraneshares CSI China Internet ETF",
            "currency": "USD",
            "nativeValue": 25380.0,
            "zarValue": 404541.97199999995
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 979278.0,
            "zarValue": 15609103.753199998
          },
          {
            "investment": "Prescient China Balanced Fund ",
            "currency": "USD",
            "nativeValue": 130300.0,
            "zarValue": 2076903.8199999998
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 394.1705
            },
            "zarFee": 6282.841267700001
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 788.341
            },
            "zarFee": 12565.682535400001
          },
          "total": {
            "nativeFees": {
              "USD": 1182.5115
            },
            "zarFee": 18848.5238031
          }
        }
      },
      {
        "id": "credo|10018459|Gennari, Enrico",
        "client": "Gennari, Enrico",
        "accountCode": "10018459",
        "identityNo": "YA3997806",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 73835.0
        },
        "zarAum": 1176885.599,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1773.0,
            "zarValue": 28260.5562
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 72062.0,
            "zarValue": 1148625.0428
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 18.45875
            },
            "zarFee": 294.22139975
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 36.9175
            },
            "zarFee": 588.4427995
          },
          "total": {
            "nativeFees": {
              "USD": 55.37625
            },
            "zarFee": 882.6641992499999
          }
        }
      },
      {
        "id": "credo|10022560|Hoar, Bianca",
        "client": "Hoar, Bianca",
        "accountCode": "10022560",
        "identityNo": "9902050064086",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 135071.0
        },
        "zarAum": 2152950.6974,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 2477.0,
            "zarValue": 39481.8938
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 51919.0,
            "zarValue": 827557.7086
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 80675.0,
            "zarValue": 1285911.095
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 33.76775
            },
            "zarFee": 538.23767435
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 67.5355
            },
            "zarFee": 1076.4753487
          },
          "total": {
            "nativeFees": {
              "USD": 101.30324999999999
            },
            "zarFee": 1614.7130230500002
          }
        }
      },
      {
        "id": "credo|10016626|Ikigai Trust",
        "client": "Ikigai Trust",
        "accountCode": "10016626",
        "identityNo": "C17145460",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 3948119.0
        },
        "zarAum": 62930647.98859999,
        "holdingCount": 10,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 9188.0,
            "zarValue": 146451.2072
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 329559.0,
            "zarValue": 5252972.724599999
          },
          {
            "investment": "Global X Copper Miners ETF",
            "currency": "USD",
            "nativeValue": 24876.0,
            "zarValue": 396508.5144
          },
          {
            "investment": "Nomura Global High Conviction Fund",
            "currency": "USD",
            "nativeValue": 20572.0,
            "zarValue": 327905.3368
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 161112.0,
            "zarValue": 2568028.6128
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 232379.0,
            "zarValue": 3703981.8326
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 136915.0,
            "zarValue": 2182342.951
          },
          {
            "investment": "Prescient China Balanced Fund ",
            "currency": "USD",
            "nativeValue": 31132.0,
            "zarValue": 496225.40079999994
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 2975048.0,
            "zarValue": 47420480.091199994
          },
          {
            "investment": "iShares Bitcoin Trust ETF",
            "currency": "USD",
            "nativeValue": 27338.0,
            "zarValue": 435751.3172
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 987.02975
            },
            "zarFee": 15732.661997149999
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 1974.0595
            },
            "zarFee": 31465.323994299997
          },
          "total": {
            "nativeFees": {
              "USD": 2961.08925
            },
            "zarFee": 47197.98599145
          }
        }
      },
      {
        "id": "credo|10019107|Irving Trust",
        "client": "Irving Trust",
        "accountCode": "10019107",
        "identityNo": "158906",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 588419.0
        },
        "zarAum": 9379045.8086,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 6000.0,
            "zarValue": 95636.4
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 438945.0,
            "zarValue": 6996519.932999999
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 143474.0,
            "zarValue": 2286889.4756
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 147.10475
            },
            "zarFee": 2344.76145215
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 294.2095
            },
            "zarFee": 4689.5229043
          },
          "total": {
            "nativeFees": {
              "USD": 441.31425
            },
            "zarFee": 7034.28435645
          }
        }
      },
      {
        "id": "credo||Jackson, Matt",
        "client": "Jackson, Matt",
        "accountCode": "",
        "identityNo": "9708125146083",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 4940.0
        },
        "zarAum": 78740.636,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 317.0,
            "zarValue": 5052.7898
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 4623.0,
            "zarValue": 73687.8462
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 1.235
            },
            "zarFee": 19.685159000000002
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 2.47
            },
            "zarFee": 39.370318000000005
          },
          "total": {
            "nativeFees": {
              "USD": 3.705
            },
            "zarFee": 59.05547700000001
          }
        }
      },
      {
        "id": "credo|10018479|Malby, Francoise",
        "client": "Malby, Francoise",
        "accountCode": "10018479",
        "identityNo": "5407180767180",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 317641.0
        },
        "zarAum": 5063006.955399999,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1476.0,
            "zarValue": 23526.554399999997
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 316165.0,
            "zarValue": 5039480.401
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 79.41025
            },
            "zarFee": 1265.7517388499998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 158.8205
            },
            "zarFee": 2531.5034776999996
          },
          "total": {
            "nativeFees": {
              "USD": 238.23075
            },
            "zarFee": 3797.255216549999
          }
        }
      },
      {
        "id": "credo|10017234|Mandy, Sean Gary",
        "client": "Mandy, Sean Gary",
        "accountCode": "10017234",
        "identityNo": "6504225046080",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 1514.0
        },
        "zarAum": 24132.2516,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1514.0,
            "zarValue": 24132.2516
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 0.3785
            },
            "zarFee": 6.0330629
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 0.757
            },
            "zarFee": 12.0661258
          },
          "total": {
            "nativeFees": {
              "USD": 1.1355
            },
            "zarFee": 18.0991887
          }
        }
      },
      {
        "id": "credo|10019456|Manolas, Viron",
        "client": "Manolas, Viron",
        "accountCode": "10019456",
        "identityNo": "7803285054086",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 51492.0
        },
        "zarAum": 820751.5848,
        "holdingCount": 6,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 8279.0,
            "zarValue": 131962.2926
          },
          {
            "investment": "Anglogold Ashanti PLC",
            "currency": "USD",
            "nativeValue": 2557.0,
            "zarValue": 40757.0458
          },
          {
            "investment": "Apple Inc",
            "currency": "USD",
            "nativeValue": 3963.0,
            "zarValue": 63167.8422
          },
          {
            "investment": "Defiance Quantum ETF",
            "currency": "USD",
            "nativeValue": 2909.0,
            "zarValue": 46367.7146
          },
          {
            "investment": "Invesco Nasdaq 100 ETF",
            "currency": "USD",
            "nativeValue": 2251.0,
            "zarValue": 35879.5894
          },
          {
            "investment": "RSA Government Bond",
            "currency": "USD",
            "nativeValue": 31533.0,
            "zarValue": 502617.1002
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 12.873
            },
            "zarFee": 205.18789619999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 25.746
            },
            "zarFee": 410.37579239999997
          },
          "total": {
            "nativeFees": {
              "USD": 38.619
            },
            "zarFee": 615.5636886
          }
        }
      },
      {
        "id": "credo|10006739|Maxwell, Dave",
        "client": "Maxwell, Dave",
        "accountCode": "10006739",
        "identityNo": "6610245172085\t",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 297044.0
        },
        "zarAum": 4734703.133599999,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1687.0,
            "zarValue": 26889.767799999998
          },
          {
            "investment": "iShares Global 100 ETF",
            "currency": "USD",
            "nativeValue": 139789.0,
            "zarValue": 2228152.7865999998
          },
          {
            "investment": "iShares Physical Gold ETF",
            "currency": "USD",
            "nativeValue": 69558.0,
            "zarValue": 1108712.7852
          },
          {
            "investment": "BBVA Global Markets ",
            "currency": "USD",
            "nativeValue": 86010.0,
            "zarValue": 1370947.794
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 74.26100000000001
            },
            "zarFee": 1183.6757833999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 148.52200000000002
            },
            "zarFee": 2367.3515667999995
          },
          "total": {
            "nativeFees": {
              "USD": 222.78300000000002
            },
            "zarFee": 3551.027350199999
          }
        }
      },
      {
        "id": "credo|10015068|McGuirk, Pamela",
        "client": "McGuirk, Pamela",
        "accountCode": "10015068",
        "identityNo": "09021951/1",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 707134.0
        },
        "zarAum": 11271291.679599999,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 10423.0,
            "zarValue": 166136.3662
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 696711.0,
            "zarValue": 11105155.313399998
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 176.7835
            },
            "zarFee": 2817.8229198999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 353.567
            },
            "zarFee": 5635.6458397999995
          },
          "total": {
            "nativeFees": {
              "USD": 530.3505
            },
            "zarFee": 8453.4687597
          }
        }
      },
      {
        "id": "credo|10015250|Sommer, Anna-Maria",
        "client": "Sommer, Anna-Maria",
        "accountCode": "10015250",
        "identityNo": "C354KY7M7",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 2815517.0
        },
        "zarAum": 44877651.6698,
        "holdingCount": 13,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 30092.0,
            "zarValue": 479648.4248
          },
          {
            "investment": "Digihost Technology Inc",
            "currency": "USD",
            "nativeValue": 2031.0,
            "zarValue": 32372.9214
          },
          {
            "investment": "HG Capital Trust",
            "currency": "USD",
            "nativeValue": 46718.0,
            "zarValue": 744656.8892
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 238680.0,
            "zarValue": 3804415.9919999996
          },
          {
            "investment": "Amplify Transformational Data Sharing ETF",
            "currency": "USD",
            "nativeValue": 27377.0,
            "zarValue": 436372.95379999996
          },
          {
            "investment": "Global X Copper Miners ETF",
            "currency": "USD",
            "nativeValue": 96440.0,
            "zarValue": 1537195.7359999998
          },
          {
            "investment": "Dodge & Cox Worldwide Funds",
            "currency": "USD",
            "nativeValue": 82986.0,
            "zarValue": 1322747.0484
          },
          {
            "investment": "Nomura Global High Conviction Fund",
            "currency": "USD",
            "nativeValue": 65217.0,
            "zarValue": 1039519.8498
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1646466.0,
            "zarValue": 26243680.1604
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 246778.0,
            "zarValue": 3933493.2531999997
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 172014.0,
            "zarValue": 2741799.9516
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 143980.0,
            "zarValue": 2294954.812
          },
          {
            "investment": "iShares Bitcoin Trust ETF",
            "currency": "USD",
            "nativeValue": 16738.0,
            "zarValue": 266793.6772
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 703.87925
            },
            "zarFee": 11219.41291745
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 1407.7585
            },
            "zarFee": 22438.8258349
          },
          "total": {
            "nativeFees": {
              "USD": 2111.63775
            },
            "zarFee": 33658.23875235
          }
        }
      },
      {
        "id": "credo|10014441|Von Arnim, Hildegard ",
        "client": "Von Arnim, Hildegard ",
        "accountCode": "10014441",
        "identityNo": "5004210080187",
        "providerId": "credo",
        "providerName": "Credo",
        "nativeValues": {
          "USD": 305534.0
        },
        "zarAum": 4870028.639599999,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Credo Trading account",
            "currency": "USD",
            "nativeValue": 1558.0,
            "zarValue": 24833.585199999998
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 303976.0,
            "zarValue": 4845195.0544
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003,
            "nativeFees": {
              "USD": 76.3835
            },
            "zarFee": 1217.5071598999998
          },
          "advisory": {
            "annualRate": 0.006,
            "nativeFees": {
              "USD": 152.767
            },
            "zarFee": 2435.0143197999996
          },
          "total": {
            "nativeFees": {
              "USD": 229.1505
            },
            "zarFee": 3652.5214796999994
          }
        }
      },
      {
        "id": "gryphon|7034|Abrahams, Denise",
        "client": "Abrahams, Denise",
        "accountCode": "7034",
        "identityNo": "7207200339087",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 13306952.780904
        },
        "zarAum": 13306952.780904,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 13306952.780904,
            "zarValue": 13306952.780904
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2772.2818293550004
            },
            "zarFee": 2772.2818293550004
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 5544.563658710001
            },
            "zarFee": 5544.563658710001
          },
          "total": {
            "nativeFees": {
              "ZAR": 8316.845488065
            },
            "zarFee": 8316.845488065
          }
        }
      },
      {
        "id": "gryphon|4972|Apex Holdings (Pty) Ltd",
        "client": "Apex Holdings (Pty) Ltd",
        "accountCode": "4972",
        "identityNo": "2015/068524/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 102169.740015
        },
        "zarAum": 102169.740015,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 102169.740015,
            "zarValue": 102169.740015
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 21.285362503125
            },
            "zarFee": 21.285362503125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 42.57072500625
            },
            "zarFee": 42.57072500625
          },
          "total": {
            "nativeFees": {
              "ZAR": 63.856087509375
            },
            "zarFee": 63.856087509375
          }
        }
      },
      {
        "id": "gryphon|5724|Apex Images CC",
        "client": "Apex Images CC",
        "accountCode": "5724",
        "identityNo": "2009/040089/23",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 792989.698748
        },
        "zarAum": 792989.698748,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 792989.698748,
            "zarValue": 792989.698748
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 165.20618723916667
            },
            "zarFee": 165.20618723916667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 330.41237447833333
            },
            "zarFee": 330.41237447833333
          },
          "total": {
            "nativeFees": {
              "ZAR": 495.61856171750003
            },
            "zarFee": 495.61856171750003
          }
        }
      },
      {
        "id": "gryphon|5215|Apex Shark Expeditions (Pty) Ltd",
        "client": "Apex Shark Expeditions (Pty) Ltd",
        "accountCode": "5215",
        "identityNo": "2015/194079/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 526411.972991
        },
        "zarAum": 526411.972991,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 526411.972991,
            "zarValue": 526411.972991
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 109.66916103979167
            },
            "zarFee": 109.66916103979167
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 219.33832207958335
            },
            "zarFee": 219.33832207958335
          },
          "total": {
            "nativeFees": {
              "ZAR": 329.007483119375
            },
            "zarFee": 329.007483119375
          }
        }
      },
      {
        "id": "gryphon|5202|Bambino International (Pty) Ltd",
        "client": "Bambino International (Pty) Ltd",
        "accountCode": "5202",
        "identityNo": "1986/002665/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 34508860.691726
        },
        "zarAum": 34508860.691726,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 34508860.691726,
            "zarValue": 34508860.691726
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 7189.345977442917
            },
            "zarFee": 7189.345977442917
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 14378.691954885833
            },
            "zarFee": 14378.691954885833
          },
          "total": {
            "nativeFees": {
              "ZAR": 21568.03793232875
            },
            "zarFee": 21568.03793232875
          }
        }
      },
      {
        "id": "gryphon|5531|Briggs, Carol-Anne",
        "client": "Briggs, Carol-Anne",
        "accountCode": "5531",
        "identityNo": "5707030094085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1688566.147048
        },
        "zarAum": 1688566.147048,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 852581.931521,
            "zarValue": 852581.931521
          },
          {
            "investment": "Gryphon Dividend Income Fund C",
            "currency": "ZAR",
            "nativeValue": 835984.215527,
            "zarValue": 835984.215527
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 351.78461396833336
            },
            "zarFee": 351.78461396833336
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 703.5692279366667
            },
            "zarFee": 703.5692279366667
          },
          "total": {
            "nativeFees": {
              "ZAR": 1055.353841905
            },
            "zarFee": 1055.353841905
          }
        }
      },
      {
        "id": "gryphon|5195|Chin, Ashley",
        "client": "Chin, Ashley",
        "accountCode": "5195",
        "identityNo": "7403295134083",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 2669668.713269
        },
        "zarAum": 2669668.713269,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 2669668.713269,
            "zarValue": 2669668.713269
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 556.1809819310416
            },
            "zarFee": 556.1809819310416
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1112.3619638620833
            },
            "zarFee": 1112.3619638620833
          },
          "total": {
            "nativeFees": {
              "ZAR": 1668.542945793125
            },
            "zarFee": 1668.542945793125
          }
        }
      },
      {
        "id": "gryphon|5025|De Mey, Armelle",
        "client": "De Mey, Armelle",
        "accountCode": "5025",
        "identityNo": "6007020264189",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 208493.441592
        },
        "zarAum": 208493.441592,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 208493.441592,
            "zarValue": 208493.441592
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 43.436133665
            },
            "zarFee": 43.436133665
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 86.87226733
            },
            "zarFee": 86.87226733
          },
          "total": {
            "nativeFees": {
              "ZAR": 130.308400995
            },
            "zarFee": 130.308400995
          }
        }
      },
      {
        "id": "gryphon|5218|De Mey, Katinga",
        "client": "De Mey, Katinga",
        "accountCode": "5218",
        "identityNo": "9606210194085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 204428.662213
        },
        "zarAum": 204428.662213,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 204428.662213,
            "zarValue": 204428.662213
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 42.58930462770834
            },
            "zarFee": 42.58930462770834
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 85.17860925541667
            },
            "zarFee": 85.17860925541667
          },
          "total": {
            "nativeFees": {
              "ZAR": 127.767913883125
            },
            "zarFee": 127.767913883125
          }
        }
      },
      {
        "id": "gryphon|5447|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "5447",
        "identityNo": "6510245060084",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 4610478.179651
        },
        "zarAum": 4610478.179651,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 4610478.179651,
            "zarValue": 4610478.179651
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 960.5162874272916
            },
            "zarFee": 960.5162874272916
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1921.0325748545831
            },
            "zarFee": 1921.0325748545831
          },
          "total": {
            "nativeFees": {
              "ZAR": 2881.548862281875
            },
            "zarFee": 2881.548862281875
          }
        }
      },
      {
        "id": "gryphon|4858|Fallows, Monique Louise",
        "client": "Fallows, Monique Louise",
        "accountCode": "4858",
        "identityNo": "7901040119085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1643203.431743
        },
        "zarAum": 1643203.431743,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 1643203.431743,
            "zarValue": 1643203.431743
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 342.33404827979166
            },
            "zarFee": 342.33404827979166
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 684.6680965595833
            },
            "zarFee": 684.6680965595833
          },
          "total": {
            "nativeFees": {
              "ZAR": 1027.002144839375
            },
            "zarFee": 1027.002144839375
          }
        }
      },
      {
        "id": "gryphon|7002|Freed, Justin",
        "client": "Freed, Justin",
        "accountCode": "7002",
        "identityNo": "7306135199085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 23396713.150892
        },
        "zarAum": 23396713.150892,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 23396713.150892,
            "zarValue": 23396713.150892
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 4874.315239769167
            },
            "zarFee": 4874.315239769167
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 9748.630479538335
            },
            "zarFee": 9748.630479538335
          },
          "total": {
            "nativeFees": {
              "ZAR": 14622.945719307503
            },
            "zarFee": 14622.945719307503
          }
        }
      },
      {
        "id": "gryphon|7001|Freed, Wayne",
        "client": "Freed, Wayne",
        "accountCode": "7001",
        "identityNo": "7711225229082",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 22733849.29666
        },
        "zarAum": 22733849.29666,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 22733849.29666,
            "zarValue": 22733849.29666
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 4736.218603470833
            },
            "zarFee": 4736.218603470833
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 9472.437206941666
            },
            "zarFee": 9472.437206941666
          },
          "total": {
            "nativeFees": {
              "ZAR": 14208.6558104125
            },
            "zarFee": 14208.6558104125
          }
        }
      },
      {
        "id": "gryphon|5521|Globrand Investments (Pty) Ltd",
        "client": "Globrand Investments (Pty) Ltd",
        "accountCode": "5521",
        "identityNo": "1981/004074/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 6327371.289897
        },
        "zarAum": 6327371.289897,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 6327371.289897,
            "zarValue": 6327371.289897
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1318.2023520618752
            },
            "zarFee": 1318.2023520618752
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 2636.4047041237504
            },
            "zarFee": 2636.4047041237504
          },
          "total": {
            "nativeFees": {
              "ZAR": 3954.607056185626
            },
            "zarFee": 3954.607056185626
          }
        }
      },
      {
        "id": "gryphon|5276|Grufin Properties (Pty) Ltd",
        "client": "Grufin Properties (Pty) Ltd",
        "accountCode": "5276",
        "identityNo": "1995/005536/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 47700280.411683
        },
        "zarAum": 47700280.411683,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 47700280.411683,
            "zarValue": 47700280.411683
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 9937.558419100626
            },
            "zarFee": 9937.558419100626
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 19875.11683820125
            },
            "zarFee": 19875.11683820125
          },
          "total": {
            "nativeFees": {
              "ZAR": 29812.675257301875
            },
            "zarFee": 29812.675257301875
          }
        }
      },
      {
        "id": "gryphon|5293|Gruzd, Marie",
        "client": "Gruzd, Marie",
        "accountCode": "5293",
        "identityNo": "4610110111186",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 27516980.413115
        },
        "zarAum": 27516980.413115,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 27516980.413115,
            "zarValue": 27516980.413115
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 5732.704252732292
            },
            "zarFee": 5732.704252732292
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 11465.408505464584
            },
            "zarFee": 11465.408505464584
          },
          "total": {
            "nativeFees": {
              "ZAR": 17198.112758196876
            },
            "zarFee": 17198.112758196876
          }
        }
      },
      {
        "id": "gryphon|5264|Gruzd, Wilfred",
        "client": "Gruzd, Wilfred",
        "accountCode": "5264",
        "identityNo": "4201045091089",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 59203148.052754
        },
        "zarAum": 59203148.052754,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 59203148.052754,
            "zarValue": 59203148.052754
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 12333.989177657082
            },
            "zarFee": 12333.989177657082
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 24667.978355314164
            },
            "zarFee": 24667.978355314164
          },
          "total": {
            "nativeFees": {
              "ZAR": 37001.96753297125
            },
            "zarFee": 37001.96753297125
          }
        }
      },
      {
        "id": "gryphon|5369|Hoar, Bianca Leigh",
        "client": "Hoar, Bianca Leigh",
        "accountCode": "5369",
        "identityNo": "9902050064086",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 50912.968806
        },
        "zarAum": 50912.968806,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 50912.968806,
            "zarValue": 50912.968806
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 10.60686850125
            },
            "zarFee": 10.60686850125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 21.2137370025
            },
            "zarFee": 21.2137370025
          },
          "total": {
            "nativeFees": {
              "ZAR": 31.820605503750002
            },
            "zarFee": 31.820605503750002
          }
        }
      },
      {
        "id": "gryphon|5006|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "5006",
        "identityNo": "6801105008085",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 13252122.037707
        },
        "zarAum": 13252122.037707,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 13252122.037707,
            "zarValue": 13252122.037707
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2760.858757855625
            },
            "zarFee": 2760.858757855625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 5521.71751571125
            },
            "zarFee": 5521.71751571125
          },
          "total": {
            "nativeFees": {
              "ZAR": 8282.576273566874
            },
            "zarFee": 8282.576273566874
          }
        }
      },
      {
        "id": "gryphon|5365|Hoar, Tayla",
        "client": "Hoar, Tayla",
        "accountCode": "5365",
        "identityNo": "9701160063081",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 491.195291
        },
        "zarAum": 491.195291,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 491.195291,
            "zarValue": 491.195291
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 0.10233235229166666
            },
            "zarFee": 0.10233235229166666
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 0.20466470458333333
            },
            "zarFee": 0.20466470458333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 0.306997056875
            },
            "zarFee": 0.306997056875
          }
        }
      },
      {
        "id": "gryphon|4816|Keren, Sara",
        "client": "Keren, Sara",
        "accountCode": "4816",
        "identityNo": "7101120072086",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 21864565.22064
        },
        "zarAum": 21864565.22064,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 21864565.22064,
            "zarValue": 21864565.22064
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 4555.1177543
            },
            "zarFee": 4555.1177543
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 9110.2355086
            },
            "zarFee": 9110.2355086
          },
          "total": {
            "nativeFees": {
              "ZAR": 13665.3532629
            },
            "zarFee": 13665.3532629
          }
        }
      },
      {
        "id": "gryphon|5682|Keurboom Trust",
        "client": "Keurboom Trust",
        "accountCode": "5682",
        "identityNo": "IT3055/2005",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 4028209.817692
        },
        "zarAum": 4028209.817692,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 4028209.817692,
            "zarValue": 4028209.817692
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 839.2103786858333
            },
            "zarFee": 839.2103786858333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1678.4207573716667
            },
            "zarFee": 1678.4207573716667
          },
          "total": {
            "nativeFees": {
              "ZAR": 2517.6311360575
            },
            "zarFee": 2517.6311360575
          }
        }
      },
      {
        "id": "gryphon|7123|Lancaster, Dean",
        "client": "Lancaster, Dean",
        "accountCode": "7123",
        "identityNo": "6710305180083",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 202207.614413
        },
        "zarAum": 202207.614413,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 202207.614413,
            "zarValue": 202207.614413
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 42.12658633604167
            },
            "zarFee": 42.12658633604167
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 84.25317267208334
            },
            "zarFee": 84.25317267208334
          },
          "total": {
            "nativeFees": {
              "ZAR": 126.379759008125
            },
            "zarFee": 126.379759008125
          }
        }
      },
      {
        "id": "gryphon|5310|Louw, Delia",
        "client": "Louw, Delia",
        "accountCode": "5310",
        "identityNo": "7612160110081",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 28573.528666
        },
        "zarAum": 28573.528666,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 28573.528666,
            "zarValue": 28573.528666
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 5.952818472083333
            },
            "zarFee": 5.952818472083333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 11.905636944166666
            },
            "zarFee": 11.905636944166666
          },
          "total": {
            "nativeFees": {
              "ZAR": 17.85845541625
            },
            "zarFee": 17.85845541625
          }
        }
      },
      {
        "id": "gryphon|5020|McGuirk, Pamela",
        "client": "McGuirk, Pamela",
        "accountCode": "5020",
        "identityNo": "5102090073080",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 1226190.06705
        },
        "zarAum": 1226190.06705,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 1226190.06705,
            "zarValue": 1226190.06705
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 255.45626396875
            },
            "zarFee": 255.45626396875
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 510.9125279375
            },
            "zarFee": 510.9125279375
          },
          "total": {
            "nativeFees": {
              "ZAR": 766.36879190625
            },
            "zarFee": 766.36879190625
          }
        }
      },
      {
        "id": "gryphon|5503|Robinson, Cheryl",
        "client": "Robinson, Cheryl",
        "accountCode": "5503",
        "identityNo": "7808230246083",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 56383.553532
        },
        "zarAum": 56383.553532,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 56383.553532,
            "zarValue": 56383.553532
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 11.746573652499999
            },
            "zarFee": 11.746573652499999
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 23.493147304999997
            },
            "zarFee": 23.493147304999997
          },
          "total": {
            "nativeFees": {
              "ZAR": 35.2397209575
            },
            "zarFee": 35.2397209575
          }
        }
      },
      {
        "id": "gryphon|5166|Snitcher, Lauren Renee",
        "client": "Snitcher, Lauren Renee",
        "accountCode": "5166",
        "identityNo": "6012290039089",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 31008.155295
        },
        "zarAum": 31008.155295,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 31008.155295,
            "zarValue": 31008.155295
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 6.460032353125
            },
            "zarFee": 6.460032353125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 12.92006470625
            },
            "zarFee": 12.92006470625
          },
          "total": {
            "nativeFees": {
              "ZAR": 19.380097059375
            },
            "zarFee": 19.380097059375
          }
        }
      },
      {
        "id": "gryphon|5266|Stingray Accessory Manufacturers (Pty) Ltd",
        "client": "Stingray Accessory Manufacturers (Pty) Ltd",
        "accountCode": "5266",
        "identityNo": "2005/004874/07",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 59739929.264526
        },
        "zarAum": 59739929.264526,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 59739929.264526,
            "zarValue": 59739929.264526
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 12445.81859677625
            },
            "zarFee": 12445.81859677625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 24891.6371935525
            },
            "zarFee": 24891.6371935525
          },
          "total": {
            "nativeFees": {
              "ZAR": 37337.45579032875
            },
            "zarFee": 37337.45579032875
          }
        }
      },
      {
        "id": "gryphon||Thomas, Mayne",
        "client": "Thomas, Mayne",
        "accountCode": "",
        "identityNo": "8908115051084",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 7064668.733903
        },
        "zarAum": 7064668.733903,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 7064668.733903,
            "zarValue": 7064668.733903
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1471.8059862297916
            },
            "zarFee": 1471.8059862297916
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 2943.6119724595833
            },
            "zarFee": 2943.6119724595833
          },
          "total": {
            "nativeFees": {
              "ZAR": 4415.417958689375
            },
            "zarFee": 4415.417958689375
          }
        }
      },
      {
        "id": "gryphon|5557|Van Niekerk, Ann",
        "client": "Van Niekerk, Ann",
        "accountCode": "5557",
        "identityNo": "4401080053081",
        "providerId": "gryphon",
        "providerName": "Gryphon",
        "nativeValues": {
          "ZAR": 57547.29426
        },
        "zarAum": 57547.29426,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Gryphon Dividend Income Fund",
            "currency": "ZAR",
            "nativeValue": 57547.29426,
            "zarValue": 57547.29426
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 11.9890196375
            },
            "zarFee": 11.9890196375
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 23.978039275
            },
            "zarFee": 23.978039275
          },
          "total": {
            "nativeFees": {
              "ZAR": 35.9670589125
            },
            "zarFee": 35.9670589125
          }
        }
      },
      {
        "id": "julius-baer|0316.6598|De Mey, Armelle",
        "client": "De Mey, Armelle",
        "accountCode": "0316.6598",
        "identityNo": "6007020264189",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 7238420.05
        },
        "zarAum": 115376072.54497,
        "holdingCount": 6,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 14439.43,
            "zarValue": 230155.850542
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 426778.96,
            "zarValue": 6802600.555024
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 470529.83,
            "zarValue": 7499963.172302
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 5903493.16,
            "zarValue": 94098138.874504
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 287286.67,
            "zarValue": 4579177.147798
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 135892.0,
            "zarValue": 2166036.9447999997
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 1942.9553518237592
            },
            "zarFee": 30969.542534859633
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 3418.6218988952764
            },
            "zarFee": 54490.78189525136
          },
          "total": {
            "nativeFees": {
              "USD": 5361.577250719036
            },
            "zarFee": 85460.324430111
          }
        }
      },
      {
        "id": "julius-baer|0321.7188|De Mey, Katinga",
        "client": "De Mey, Katinga",
        "accountCode": "0321.7188",
        "identityNo": "9606210194085",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 1767165.51
        },
        "zarAum": 28167557.930093996,
        "holdingCount": 5,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 84599.91,
            "zarValue": 1348471.805454
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 570606.54,
            "zarValue": 9095125.883676
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 567715.46,
            "zarValue": 9049043.803124
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 405910.43,
            "zarValue": 6469968.707942
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 138333.17,
            "zarValue": 2204947.729898
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 474.3471173951646
            },
            "zarFee": 7560.8084430084855
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 834.6117895518428
            },
            "zarFee": 13303.21115838264
          },
          "total": {
            "nativeFees": {
              "USD": 1308.9589069470073
            },
            "zarFee": 20864.019601391126
          }
        }
      },
      {
        "id": "julius-baer|0315.2553|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "0315.2553",
        "identityNo": "6801105008085",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 1958989.61
        },
        "zarAum": 31225118.989634,
        "holdingCount": 9,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 19923.45,
            "zarValue": 317567.83892999997
          },
          {
            "investment": "Dodge & Cox Worldwide Funds",
            "currency": "USD",
            "nativeValue": 17237.99,
            "zarValue": 274763.21780600003
          },
          {
            "investment": "Global X Copper Miners ETF",
            "currency": "USD",
            "nativeValue": 80866.5,
            "zarValue": 1288963.4900999998
          },
          {
            "investment": "Invesco Global Clean Energy ETF",
            "currency": "USD",
            "nativeValue": 14229.0,
            "zarValue": 226801.72259999998
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1357176.81,
            "zarValue": 21632584.045314
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 221321.63,
            "zarValue": 3527733.989222
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 136234.87,
            "zarValue": 2171502.086878
          },
          {
            "investment": "Gold",
            "currency": "USD",
            "nativeValue": 43053.75,
            "zarValue": 686250.9427499999
          },
          {
            "investment": "Prescient China Balanced Fund ",
            "currency": "USD",
            "nativeValue": 68945.61,
            "zarValue": 1098951.656034
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 525.8370363456096
            },
            "zarFee": 8381.52685712721
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 925.2080888085952
            },
            "zarFee": 14747.261810755723
          },
          "total": {
            "nativeFees": {
              "USD": 1451.045125154205
            },
            "zarFee": 23128.78866788293
          }
        }
      },
      {
        "id": "julius-baer|0316.9089|Hughes, Carol",
        "client": "Hughes, Carol",
        "accountCode": "0316.9089",
        "identityNo": "548451598",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 369273.52
        },
        "zarAum": 5885998.344688,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 92.77,
            "zarValue": 1478.6981379999997
          },
          {
            "investment": "Wealthworks Global Flexible Fund (USD)",
            "currency": "USD",
            "nativeValue": 369180.75,
            "zarValue": 5884519.64655
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 99.12134927439007
            },
            "zarFee": 1579.9348346242132
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 174.40360374694512
            },
            "zarFee": 2779.8888015640573
          },
          "total": {
            "nativeFees": {
              "USD": 273.5249530213352
            },
            "zarFee": 4359.82363618827
          }
        }
      },
      {
        "id": "julius-baer|0315.4230|Keren, Avi & Glynis",
        "client": "Keren, Avi & Glynis",
        "accountCode": "0315.4230",
        "identityNo": "6909305074086",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 1363294.9500000002
        },
        "zarAum": 21730103.52603,
        "holdingCount": 16,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 59296.88,
            "zarValue": 945156.6890719999
          },
          {
            "investment": "Bayer AG",
            "currency": "USD",
            "nativeValue": 892.82,
            "zarValue": 14231.015108
          },
          {
            "investment": "Alphabet",
            "currency": "USD",
            "nativeValue": 18705.6,
            "zarValue": 298156.04063999996
          },
          {
            "investment": "Apple Inc",
            "currency": "USD",
            "nativeValue": 739704.0,
            "zarValue": 11790437.9376
          },
          {
            "investment": "Clorox Co",
            "currency": "USD",
            "nativeValue": 635.8,
            "zarValue": 10134.270519999998
          },
          {
            "investment": "Fossil Group Inc",
            "currency": "USD",
            "nativeValue": 42096.6,
            "zarValue": 670994.5460399999
          },
          {
            "investment": "Global X Artifical Intelligence & Technology ETF",
            "currency": "USD",
            "nativeValue": 10052.0,
            "zarValue": 160222.84879999998
          },
          {
            "investment": "Intel Corp",
            "currency": "USD",
            "nativeValue": 1641.96,
            "zarValue": 26171.857224
          },
          {
            "investment": "Invesco QQQ Trust Series",
            "currency": "USD",
            "nativeValue": 9109.35,
            "zarValue": 145197.57339
          },
          {
            "investment": "Meta Platforms Inc",
            "currency": "USD",
            "nativeValue": 6481.8,
            "zarValue": 103316.00292
          },
          {
            "investment": "Microsoft Corp",
            "currency": "USD",
            "nativeValue": 6283.84,
            "zarValue": 100160.639296
          },
          {
            "investment": "Paypal Holdings Inc",
            "currency": "USD",
            "nativeValue": 323.47,
            "zarValue": 5155.917718000001
          },
          {
            "investment": "Tesla Inc",
            "currency": "USD",
            "nativeValue": 42263.55,
            "zarValue": 673655.62887
          },
          {
            "investment": "Tripadvisor Inc",
            "currency": "USD",
            "nativeValue": 738.03,
            "zarValue": 11763.755382
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 391206.75,
            "zarValue": 6235600.870949999
          },
          {
            "investment": "Gold",
            "currency": "USD",
            "nativeValue": 33862.5,
            "zarValue": 539747.9325
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 365.9391415419177
            },
            "zarFee": 5832.850352693243
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 643.8684047803141
            },
            "zarFee": 10262.876051155336
          },
          "total": {
            "nativeFees": {
              "USD": 1009.8075463222318
            },
            "zarFee": 16095.726403848577
          }
        }
      },
      {
        "id": "julius-baer|0321.5916|Marula Trading & Investments Limited",
        "client": "Marula Trading & Investments Limited",
        "accountCode": "0321.5916",
        "identityNo": "70414",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 4269854.380000001
        },
        "zarAum": 68058916.904572,
        "holdingCount": 9,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": -4043.36,
            "zarValue": -64448.732383999995
          },
          {
            "investment": "Blackrock ICS US Dollar Liquidity Fund",
            "currency": "USD",
            "nativeValue": 14835.05,
            "zarValue": 236461.79596999998
          },
          {
            "investment": "Rubrics Enhanced Yield UCITS Fund",
            "currency": "USD",
            "nativeValue": 45775.29,
            "zarValue": 729630.657426
          },
          {
            "investment": "Meituan",
            "currency": "USD",
            "nativeValue": 5436.16,
            "zarValue": 86649.12870399999
          },
          {
            "investment": "Tencent Holdings Limited",
            "currency": "USD",
            "nativeValue": 347002.89,
            "zarValue": 5531017.864866
          },
          {
            "investment": "Alibaba Group Holding",
            "currency": "USD",
            "nativeValue": 133301.75,
            "zarValue": 2124749.91395
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1640696.88,
            "zarValue": 26151723.849072
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 680386.68,
            "zarValue": 10844955.447192
          },
          {
            "investment": "Xhaos Special Opportunities Fund D",
            "currency": "USD",
            "nativeValue": 1406463.04,
            "zarValue": 22418176.979776
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 1146.1253093662506
            },
            "zarFee": 18268.54975611241
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 2016.6027375769543
            },
            "zarFee": 32143.437675334095
          },
          "total": {
            "nativeFees": {
              "USD": 3162.728046943205
            },
            "zarFee": 50411.987431446505
          }
        }
      },
      {
        "id": "julius-baer|0319.4475|Terra-Mater Limited",
        "client": "Terra-Mater Limited",
        "accountCode": "0319.4475",
        "identityNo": "56121 C2/GBL",
        "providerId": "julius-baer",
        "providerName": "Julius Baer",
        "nativeValues": {
          "USD": 3511118.8899999997
        },
        "zarAum": 55965128.435266,
        "holdingCount": 5,
        "holdings": [
          {
            "investment": "Julius Baer Trading Account",
            "currency": "USD",
            "nativeValue": 7495.72,
            "zarValue": 119477.279368
          },
          {
            "investment": "Scottish Mortgage Investment Trust",
            "currency": "USD",
            "nativeValue": 191615.52,
            "zarValue": 3054236.4194879998
          },
          {
            "investment": "Wealthworks Global Flexible Fund",
            "currency": "USD",
            "nativeValue": 1210484.46,
            "zarValue": 19294396.001723997
          },
          {
            "investment": "Diversified Trading Fund B1",
            "currency": "USD",
            "nativeValue": 729438.41,
            "zarValue": 11626810.592354
          },
          {
            "investment": "Xhaos Special Opportunities Fund",
            "currency": "USD",
            "nativeValue": 1372084.78,
            "zarValue": 21870208.142332
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.003221070905091383,
            "nativeFees": {
              "USD": 942.463575074646
            },
            "zarFee": 15022.303908544813
          },
          "advisory": {
            "annualRate": 0.0056674609242583695,
            "nativeFees": {
              "USD": 1658.260759125035
            },
            "zarFee": 26431.681543997587
          },
          "total": {
            "nativeFees": {
              "USD": 2600.724334199681
            },
            "zarFee": 41453.9854525424
          }
        }
      },
      {
        "id": "northstar-fnb|1003725|Fallows, Christopher",
        "client": "Fallows, Christopher",
        "accountCode": "1003725",
        "identityNo": "7209215223082",
        "providerId": "northstar-fnb",
        "providerName": "Northstar FNB",
        "nativeValues": {
          "USD": 524020.76
        },
        "zarAum": 8352576.501944,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "FNB Securities Trading Account (Northstar)",
            "currency": "USD",
            "nativeValue": 524020.76,
            "zarValue": 8352576.501944
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "USD": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "USD": 218.34198333333336
            },
            "zarFee": 3480.2402091433337
          },
          "total": {
            "nativeFees": {
              "USD": 218.34198333333336
            },
            "zarFee": 3480.2402091433337
          }
        }
      },
      {
        "id": "northstar-sanlam||Fowler, Merle",
        "client": "Fowler, Merle",
        "accountCode": "",
        "identityNo": "5202120048084",
        "providerId": "northstar-sanlam",
        "providerName": "Northstar Sanlam",
        "nativeValues": {
          "ZAR": 3050769.63
        },
        "zarAum": 3050769.63,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Northstar SCI Managed Fund",
            "currency": "ZAR",
            "nativeValue": 3050769.63,
            "zarValue": 3050769.63
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "ZAR": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1271.1540125
            },
            "zarFee": 1271.1540125
          },
          "total": {
            "nativeFees": {
              "ZAR": 1271.1540125
            },
            "zarFee": 1271.1540125
          }
        }
      },
      {
        "id": "peresec|197970|Keren, Sara",
        "client": "Keren, Sara",
        "accountCode": "197970",
        "identityNo": "7101120072086",
        "providerId": "peresec",
        "providerName": "Peresec",
        "nativeValues": {
          "ZAR": 3625180.11
        },
        "zarAum": 3625180.11,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Peresec Trading Account",
            "currency": "ZAR",
            "nativeValue": 3625180.11,
            "zarValue": 3625180.11
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "ZAR": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1510.4917125
            },
            "zarFee": 1510.4917125
          },
          "total": {
            "nativeFees": {
              "ZAR": 1510.4917125
            },
            "zarFee": 1510.4917125
          }
        }
      },
      {
        "id": "prescient||Commercial Buildings (Pty) Ltd",
        "client": "Commercial Buildings (Pty) Ltd",
        "accountCode": "",
        "identityNo": "1927/000221/07",
        "providerId": "prescient",
        "providerName": "Prescient",
        "nativeValues": {
          "ZAR": 43570347.21
        },
        "zarAum": 43570347.21,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Laurium Stable Prescient Fund A2",
            "currency": "ZAR",
            "nativeValue": 43570347.21,
            "zarValue": 43570347.21
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0,
            "nativeFees": {
              "ZAR": 0.0
            },
            "zarFee": 0.0
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 18154.3113375
            },
            "zarFee": 18154.3113375
          },
          "total": {
            "nativeFees": {
              "ZAR": 18154.3113375
            },
            "zarFee": 18154.3113375
          }
        }
      },
      {
        "id": "prime|PRI50594441|Apex Holdings (Pty) Ltd",
        "client": "Apex Holdings (Pty) Ltd",
        "accountCode": "PRI50594441",
        "identityNo": "2015/068524/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 8089536.2
        },
        "zarAum": 8089536.2,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Centaur BCI Flexible Fund ( C )",
            "currency": "ZAR",
            "nativeValue": 316868.94,
            "zarValue": 316868.94
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 611408.78,
            "zarValue": 611408.78
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 7161258.48,
            "zarValue": 7161258.48
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1685.3200416666668
            },
            "zarFee": 1685.3200416666668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3370.6400833333337
            },
            "zarFee": 3370.6400833333337
          },
          "total": {
            "nativeFees": {
              "ZAR": 5055.9601250000005
            },
            "zarFee": 5055.9601250000005
          }
        }
      },
      {
        "id": "prime||Apex Images CC",
        "client": "Apex Images CC",
        "accountCode": "",
        "identityNo": "2009/040089/23",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1024749.3300000001
        },
        "zarAum": 1024749.3300000001,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 515678.64,
            "zarValue": 515678.64
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 509070.69,
            "zarValue": 509070.69
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 213.48944375
            },
            "zarFee": 213.48944375
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 426.9788875
            },
            "zarFee": 426.9788875
          },
          "total": {
            "nativeFees": {
              "ZAR": 640.46833125
            },
            "zarFee": 640.46833125
          }
        }
      },
      {
        "id": "prime|PRI202110280001|Blackbeard, Ginette",
        "client": "Blackbeard, Ginette",
        "accountCode": "PRI202110280001",
        "identityNo": "8002160132088",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 865060.19
        },
        "zarAum": 865060.19,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 53830.06,
            "zarValue": 53830.06
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 810854.19,
            "zarValue": 810854.19
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 375.94,
            "zarValue": 375.94
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 180.22087291666665
            },
            "zarFee": 180.22087291666665
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 360.4417458333333
            },
            "zarFee": 360.4417458333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 540.66261875
            },
            "zarFee": 540.66261875
          }
        }
      },
      {
        "id": "prime|PRI202212210002|Commercial Buildings (Pty) Ltd",
        "client": "Commercial Buildings (Pty) Ltd",
        "accountCode": "PRI202212210002",
        "identityNo": "1927/000221/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 38939859.48
        },
        "zarAum": 38939859.48,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 38939859.48,
            "zarValue": 38939859.48
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 8112.470724999999
            },
            "zarFee": 8112.470724999999
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 16224.941449999998
            },
            "zarFee": 16224.941449999998
          },
          "total": {
            "nativeFees": {
              "ZAR": 24337.412174999998
            },
            "zarFee": 24337.412174999998
          }
        }
      },
      {
        "id": "prime|PRI201806040001|De Mey, Armelle",
        "client": "De Mey, Armelle",
        "accountCode": "PRI201806040001",
        "identityNo": "6007020264189",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1586060.46
        },
        "zarAum": 1586060.46,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1586060.46,
            "zarValue": 1586060.46
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 330.4292625
            },
            "zarFee": 330.4292625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 660.858525
            },
            "zarFee": 660.858525
          },
          "total": {
            "nativeFees": {
              "ZAR": 991.2877874999999
            },
            "zarFee": 991.2877874999999
          }
        }
      },
      {
        "id": "prime|PRI201908270001|De Mey, Katinga",
        "client": "De Mey, Katinga",
        "accountCode": "PRI201908270001",
        "identityNo": "9606210194085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 361148.98
        },
        "zarAum": 361148.98,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 361148.98,
            "zarValue": 361148.98
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 75.23937083333333
            },
            "zarFee": 75.23937083333333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 150.47874166666665
            },
            "zarFee": 150.47874166666665
          },
          "total": {
            "nativeFees": {
              "ZAR": 225.71811249999996
            },
            "zarFee": 225.71811249999996
          }
        }
      },
      {
        "id": "prime|PRI202212050001|Eskinazi, Ray",
        "client": "Eskinazi, Ray",
        "accountCode": "PRI202212050001",
        "identityNo": "5708225780082",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2618703.68
        },
        "zarAum": 2618703.68,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 2618703.68,
            "zarValue": 2618703.68
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 545.5632666666667
            },
            "zarFee": 545.5632666666667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1091.1265333333333
            },
            "zarFee": 1091.1265333333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 1636.6898
            },
            "zarFee": 1636.6898
          }
        }
      },
      {
        "id": "prime|PRI201803280003|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "PRI201803280003",
        "identityNo": "6510245060084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7773042.72
        },
        "zarAum": 7773042.72,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Preservation Pension Plan)",
            "currency": "ZAR",
            "nativeValue": 7773042.72,
            "zarValue": 7773042.72
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1619.3839
            },
            "zarFee": 1619.3839
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3238.7678
            },
            "zarFee": 3238.7678
          },
          "total": {
            "nativeFees": {
              "ZAR": 4858.1517
            },
            "zarFee": 4858.1517
          }
        }
      },
      {
        "id": "prime|PRI201911150005|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "PRI201911150005",
        "identityNo": "6510245060084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 885311.03
        },
        "zarAum": 885311.03,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Retirement Plan)",
            "currency": "ZAR",
            "nativeValue": 885311.03,
            "zarValue": 885311.03
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 184.43979791666666
            },
            "zarFee": 184.43979791666666
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 368.8795958333333
            },
            "zarFee": 368.8795958333333
          },
          "total": {
            "nativeFees": {
              "ZAR": 553.31939375
            },
            "zarFee": 553.31939375
          }
        }
      },
      {
        "id": "prime|PRI202012090001|Eskinazi, Richard David",
        "client": "Eskinazi, Richard David",
        "accountCode": "PRI202012090001",
        "identityNo": "6510245060084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 361673.6
        },
        "zarAum": 361673.6,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Preservation Provident Plan)",
            "currency": "ZAR",
            "nativeValue": 361673.6,
            "zarValue": 361673.6
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 75.34866666666666
            },
            "zarFee": 75.34866666666666
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 150.69733333333332
            },
            "zarFee": 150.69733333333332
          },
          "total": {
            "nativeFees": {
              "ZAR": 226.046
            },
            "zarFee": 226.046
          }
        }
      },
      {
        "id": "prime|PRI202008120001|Fallows, Monique Louise",
        "client": "Fallows, Monique Louise",
        "accountCode": "PRI202008120001",
        "identityNo": "7901040119085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7460405.28
        },
        "zarAum": 7460405.28,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "36ONE Flexible",
            "currency": "ZAR",
            "nativeValue": 309575.13,
            "zarValue": 309575.13
          },
          {
            "investment": "Fairtree Equity Prescient Fund (A1) ",
            "currency": "ZAR",
            "nativeValue": 397054.94,
            "zarValue": 397054.94
          },
          {
            "investment": "Centaur BCI Flexible Fund ( C )",
            "currency": "ZAR",
            "nativeValue": 310703.68,
            "zarValue": 310703.68
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 6443071.53,
            "zarValue": 6443071.53
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1554.2511000000002
            },
            "zarFee": 1554.2511000000002
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3108.5022000000004
            },
            "zarFee": 3108.5022000000004
          },
          "total": {
            "nativeFees": {
              "ZAR": 4662.7533
            },
            "zarFee": 4662.7533
          }
        }
      },
      {
        "id": "prime|PRI202110110005|Fowler, Merle",
        "client": "Fowler, Merle",
        "accountCode": "PRI202110110005",
        "identityNo": "5202120048084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1166243.27
        },
        "zarAum": 1166243.27,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 278075.6,
            "zarValue": 278075.6
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 888017.19,
            "zarValue": 888017.19
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 150.48,
            "zarValue": 150.48
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 242.96734791666668
            },
            "zarFee": 242.96734791666668
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 485.93469583333336
            },
            "zarFee": 485.93469583333336
          },
          "total": {
            "nativeFees": {
              "ZAR": 728.9020437500001
            },
            "zarFee": 728.9020437500001
          }
        }
      },
      {
        "id": "prime|PRI202308310001|Gennari Family Trust",
        "client": "Gennari Family Trust",
        "accountCode": "PRI202308310001",
        "identityNo": "IT000218/2022(C)",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2852798.3999999994
        },
        "zarAum": 2852798.3999999994,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 1097060.94,
            "zarValue": 1097060.94
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1690418.2,
            "zarValue": 1690418.2
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 64876.94,
            "zarValue": 64876.94
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 442.32,
            "zarValue": 442.32
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 594.333
            },
            "zarFee": 594.333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1188.666
            },
            "zarFee": 1188.666
          },
          "total": {
            "nativeFees": {
              "ZAR": 1782.9989999999998
            },
            "zarFee": 1782.9989999999998
          }
        }
      },
      {
        "id": "prime|PRI202450599542|Hedley, James",
        "client": "Hedley, James",
        "accountCode": "PRI202450599542",
        "identityNo": "8405255864186",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1670760.31
        },
        "zarAum": 1670760.31,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1670760.31,
            "zarValue": 1670760.31
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 348.07506458333336
            },
            "zarFee": 348.07506458333336
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 696.1501291666667
            },
            "zarFee": 696.1501291666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 1044.22519375
            },
            "zarFee": 1044.22519375
          }
        }
      },
      {
        "id": "prime|PRI201802280001|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "PRI201802280001",
        "identityNo": "6801105008085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2781241.69
        },
        "zarAum": 2781241.69,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Retirement Plan)",
            "currency": "ZAR",
            "nativeValue": 2781241.69,
            "zarValue": 2781241.69
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 579.4253520833333
            },
            "zarFee": 579.4253520833333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1158.8507041666667
            },
            "zarFee": 1158.8507041666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 1738.27605625
            },
            "zarFee": 1738.27605625
          }
        }
      },
      {
        "id": "prime|PRI201807090001|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "PRI201807090001",
        "identityNo": "6801105008085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 7339842.57
        },
        "zarAum": 7339842.57,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Investment Plan)",
            "currency": "ZAR",
            "nativeValue": 7339842.57,
            "zarValue": 7339842.57
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1529.1338687500001
            },
            "zarFee": 1529.1338687500001
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3058.2677375000003
            },
            "zarFee": 3058.2677375000003
          },
          "total": {
            "nativeFees": {
              "ZAR": 4587.40160625
            },
            "zarFee": 4587.40160625
          }
        }
      },
      {
        "id": "prime|PRI202108240002|Hoar, Marc",
        "client": "Hoar, Marc",
        "accountCode": "PRI202108240002",
        "identityNo": "6801105008085",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 50937930.53999999
        },
        "zarAum": 50937930.53999999,
        "holdingCount": 9,
        "holdings": [
          {
            "investment": "Fairtree Equity Prescient (A1)",
            "currency": "ZAR",
            "nativeValue": 1656282.1,
            "zarValue": 1656282.1
          },
          {
            "investment": "ClucasGray Prescient Equity Fund (B1)",
            "currency": "ZAR",
            "nativeValue": 1560650.75,
            "zarValue": 1560650.75
          },
          {
            "investment": "Laurium Flexible Prescient Fund Fund (B4)",
            "currency": "ZAR",
            "nativeValue": 1429386.17,
            "zarValue": 1429386.17
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 11342752.48,
            "zarValue": 11342752.48
          },
          {
            "investment": "36One Bci Flexible Opportunity Fund (A)",
            "currency": "ZAR",
            "nativeValue": 1428499.33,
            "zarValue": 1428499.33
          },
          {
            "investment": "Centaur Bci Flexible Fund (C)",
            "currency": "ZAR",
            "nativeValue": 1755457.49,
            "zarValue": 1755457.49
          },
          {
            "investment": "Obsidian SCI Equity Fund (B3)",
            "currency": "ZAR",
            "nativeValue": 1571196.31,
            "zarValue": 1571196.31
          },
          {
            "investment": "Coronation Global Emerging Markets Flexible (P)",
            "currency": "ZAR",
            "nativeValue": 1169787.61,
            "zarValue": 1169787.61
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds (Investment Plan)",
            "currency": "ZAR",
            "nativeValue": 29023918.3,
            "zarValue": 29023918.3
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 10612.068862499998
            },
            "zarFee": 10612.068862499998
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 21224.137724999997
            },
            "zarFee": 21224.137724999997
          },
          "total": {
            "nativeFees": {
              "ZAR": 31836.206587499997
            },
            "zarFee": 31836.206587499997
          }
        }
      },
      {
        "id": "prime|PRI202450595140|Kovacs Investments 492 (PTY) LTD",
        "client": "Kovacs Investments 492 (PTY) LTD",
        "accountCode": "PRI202450595140",
        "identityNo": "2002/006975/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 11313378.98
        },
        "zarAum": 11313378.98,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Prescient Income Provider (A2)",
            "currency": "ZAR",
            "nativeValue": 1009759.18,
            "zarValue": 1009759.18
          },
          {
            "investment": "Laurium Stable Prescient Fund (A2)",
            "currency": "ZAR",
            "nativeValue": 4464365.54,
            "zarValue": 4464365.54
          },
          {
            "investment": "Wealthworks Prime Cautious FOF (B)",
            "currency": "ZAR",
            "nativeValue": 5839048.92,
            "zarValue": 5839048.92
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 205.34,
            "zarValue": 205.34
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 2356.953954166667
            },
            "zarFee": 2356.953954166667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 4713.907908333334
            },
            "zarFee": 4713.907908333334
          },
          "total": {
            "nativeFees": {
              "ZAR": 7070.8618625
            },
            "zarFee": 7070.8618625
          }
        }
      },
      {
        "id": "prime|PRI202301230001|Louw, Delia",
        "client": "Louw, Delia",
        "accountCode": "PRI202301230001",
        "identityNo": "7612160110081",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1784658.98
        },
        "zarAum": 1784658.98,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1784658.98,
            "zarValue": 1784658.98
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 371.8039541666667
            },
            "zarFee": 371.8039541666667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 743.6079083333334
            },
            "zarFee": 743.6079083333334
          },
          "total": {
            "nativeFees": {
              "ZAR": 1115.4118625
            },
            "zarFee": 1115.4118625
          }
        }
      },
      {
        "id": "prime|PRI202202070007|Mackay Davidson, Charles Stuart",
        "client": "Mackay Davidson, Charles Stuart",
        "accountCode": "PRI202202070007",
        "identityNo": "6701275028089",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 640588.1499999999
        },
        "zarAum": 640588.1499999999,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 6629.36,
            "zarValue": 6629.36
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 633834.58,
            "zarValue": 633834.58
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 124.21,
            "zarValue": 124.21
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 133.45586458333332
            },
            "zarFee": 133.45586458333332
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 266.91172916666665
            },
            "zarFee": 266.91172916666665
          },
          "total": {
            "nativeFees": {
              "ZAR": 400.36759374999997
            },
            "zarFee": 400.36759374999997
          }
        }
      },
      {
        "id": "prime|PRI201911110003|Mandy, Shelley Anne",
        "client": "Mandy, Shelley Anne",
        "accountCode": "PRI201911110003",
        "identityNo": "6211080127084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 8291621.34
        },
        "zarAum": 8291621.34,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 8291187.1,
            "zarValue": 8291187.1
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 434.24,
            "zarValue": 434.24
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1727.4211125
            },
            "zarFee": 1727.4211125
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3454.842225
            },
            "zarFee": 3454.842225
          },
          "total": {
            "nativeFees": {
              "ZAR": 5182.2633375
            },
            "zarFee": 5182.2633375
          }
        }
      },
      {
        "id": "prime|PRI202550601174|Moyo, Thithibele",
        "client": "Moyo, Thithibele",
        "accountCode": "PRI202550601174",
        "identityNo": "FN497554",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 15317.8
        },
        "zarAum": 15317.8,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 15317.8,
            "zarValue": 15317.8
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 3.1912083333333334
            },
            "zarFee": 3.1912083333333334
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 6.382416666666667
            },
            "zarFee": 6.382416666666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 9.573625
            },
            "zarFee": 9.573625
          }
        }
      },
      {
        "id": "prime|PRI202103150001|Robinson, Cheryl",
        "client": "Robinson, Cheryl",
        "accountCode": "PRI202103150001",
        "identityNo": "7808230246083",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 121219.31
        },
        "zarAum": 121219.31,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 121219.31,
            "zarValue": 121219.31
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 25.254022916666667
            },
            "zarFee": 25.254022916666667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 50.508045833333334
            },
            "zarFee": 50.508045833333334
          },
          "total": {
            "nativeFees": {
              "ZAR": 75.76206875
            },
            "zarFee": 75.76206875
          }
        }
      },
      {
        "id": "prime|PRI202209280001|Smuts, Hanny",
        "client": "Smuts, Hanny",
        "accountCode": "PRI202209280001",
        "identityNo": "5306120097080",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1474232.62
        },
        "zarAum": 1474232.62,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Matrix SCI Stable Income Fund B1",
            "currency": "ZAR",
            "nativeValue": 213963.29,
            "zarValue": 213963.29
          },
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 216180.73,
            "zarValue": 216180.73
          },
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1043542.53,
            "zarValue": 1043542.53
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 546.07,
            "zarValue": 546.07
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 307.13179583333334
            },
            "zarFee": 307.13179583333334
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 614.2635916666667
            },
            "zarFee": 614.2635916666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 921.3953875
            },
            "zarFee": 921.3953875
          }
        }
      },
      {
        "id": "prime|PRI201903150001|Snitcher, Lauren Renee",
        "client": "Snitcher, Lauren Renee",
        "accountCode": "PRI201903150001",
        "identityNo": "6012290039089",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 8986575.739999998
        },
        "zarAum": 8986575.739999998,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Prescient Income Provider Fund",
            "currency": "ZAR",
            "nativeValue": 11.43,
            "zarValue": 11.43
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 8985751.61,
            "zarValue": 8985751.61
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 812.7,
            "zarValue": 812.7
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 1872.2032791666663
            },
            "zarFee": 1872.2032791666663
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 3744.4065583333327
            },
            "zarFee": 3744.4065583333327
          },
          "total": {
            "nativeFees": {
              "ZAR": 5616.609837499999
            },
            "zarFee": 5616.609837499999
          }
        }
      },
      {
        "id": "prime|PRI202204040004|Sweet Grass Trading 12 (Pty) Ltd",
        "client": "Sweet Grass Trading 12 (Pty) Ltd",
        "accountCode": "PRI202204040004",
        "identityNo": "2008/025068/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 45140516.230000004
        },
        "zarAum": 45140516.230000004,
        "holdingCount": 6,
        "holdings": [
          {
            "investment": "36One BCI Global Equity Feeder Fund (A) (36FNDA)",
            "currency": "ZAR",
            "nativeValue": 4107675.34,
            "zarValue": 4107675.34
          },
          {
            "investment": "Catalyst SCI Global Real Estate SCI Feeder (B) (CGRE)",
            "currency": "ZAR",
            "nativeValue": 2799328.99,
            "zarValue": 2799328.99
          },
          {
            "investment": "Centaur Bci Flexible Fund ( C )",
            "currency": "ZAR",
            "nativeValue": 662827.98,
            "zarValue": 662827.98
          },
          {
            "investment": "ClucasGray Prescient Equity Fund (B1) (CGPB1)",
            "currency": "ZAR",
            "nativeValue": 754666.72,
            "zarValue": 754666.72
          },
          {
            "investment": "Coronation Global Emerging Markets Flexible [ZAR] Fund (P) (CGEMB4)",
            "currency": "ZAR",
            "nativeValue": 7886604.41,
            "zarValue": 7886604.41
          },
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 28929412.79,
            "zarValue": 28929412.79
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 9404.274214583334
            },
            "zarFee": 9404.274214583334
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 18808.54842916667
            },
            "zarFee": 18808.54842916667
          },
          "total": {
            "nativeFees": {
              "ZAR": 28212.822643750005
            },
            "zarFee": 28212.822643750005
          }
        }
      },
      {
        "id": "prime|PRI202450595273|Sweet Grass Trading 12 Acc 2",
        "client": "Sweet Grass Trading 12 Acc 2",
        "accountCode": "PRI202450595273",
        "identityNo": "2008/025068/07",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 4096969.24
        },
        "zarAum": 4096969.24,
        "holdingCount": 4,
        "holdings": [
          {
            "investment": "Laurium Stable Prescient Fund (A2)",
            "currency": "ZAR",
            "nativeValue": 493841.79,
            "zarValue": 493841.79
          },
          {
            "investment": "Wealthworks Prime Managed FOF (A)",
            "currency": "ZAR",
            "nativeValue": 2807084.31,
            "zarValue": 2807084.31
          },
          {
            "investment": "Centaur Bci Flexible Fund (C)",
            "currency": "ZAR",
            "nativeValue": 473593.88,
            "zarValue": 473593.88
          },
          {
            "investment": "36One Bci Flexible Opportunity Fund (A)",
            "currency": "ZAR",
            "nativeValue": 322449.26,
            "zarValue": 322449.26
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 853.5352583333333
            },
            "zarFee": 853.5352583333333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1707.0705166666667
            },
            "zarFee": 1707.0705166666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 2560.605775
            },
            "zarFee": 2560.605775
          }
        }
      },
      {
        "id": "prime|PRI202110190002|Three Sisters Trust",
        "client": "Three Sisters Trust",
        "accountCode": "PRI202110190002",
        "identityNo": "IT4597/98",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1652371.28
        },
        "zarAum": 1652371.28,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1652371.28,
            "zarValue": 1652371.28
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 344.2440166666667
            },
            "zarFee": 344.2440166666667
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 688.4880333333334
            },
            "zarFee": 688.4880333333334
          },
          "total": {
            "nativeFees": {
              "ZAR": 1032.73205
            },
            "zarFee": 1032.73205
          }
        }
      },
      {
        "id": "prime|PRI202111020001|Van Niekerk, Ann",
        "client": "Van Niekerk, Ann",
        "accountCode": "PRI202111020001",
        "identityNo": "4401080053081",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 431480.46
        },
        "zarAum": 431480.46,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Cautious Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 431060.09,
            "zarValue": 431060.09
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 420.37,
            "zarValue": 420.37
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 89.89176250000001
            },
            "zarFee": 89.89176250000001
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 179.78352500000003
            },
            "zarFee": 179.78352500000003
          },
          "total": {
            "nativeFees": {
              "ZAR": 269.6752875
            },
            "zarFee": 269.6752875
          }
        }
      },
      {
        "id": "prime|PRI201811080002|Von Arnim, Achim Alard Giselher",
        "client": "Von Arnim, Achim Alard Giselher",
        "accountCode": "PRI201811080002",
        "identityNo": "4507195061080",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2235094.89
        },
        "zarAum": 2235094.89,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 2235043.06,
            "zarValue": 2235043.06
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 51.83,
            "zarValue": 51.83
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 465.6447687500001
            },
            "zarFee": 465.6447687500001
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 931.2895375000002
            },
            "zarFee": 931.2895375000002
          },
          "total": {
            "nativeFees": {
              "ZAR": 1396.9343062500002
            },
            "zarFee": 1396.9343062500002
          }
        }
      },
      {
        "id": "prime|PRI201811080003|Von Arnim, Helga Hildegard Katharina",
        "client": "Von Arnim, Helga Hildegard Katharina",
        "accountCode": "PRI201811080003",
        "identityNo": "5004210080187",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1681563.57
        },
        "zarAum": 1681563.57,
        "holdingCount": 2,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1681443.32,
            "zarValue": 1681443.32
          },
          {
            "investment": "Cash",
            "currency": "ZAR",
            "nativeValue": 120.25,
            "zarValue": 120.25
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 350.3257437500001
            },
            "zarFee": 350.3257437500001
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 700.6514875000001
            },
            "zarFee": 700.6514875000001
          },
          "total": {
            "nativeFees": {
              "ZAR": 1050.9772312500002
            },
            "zarFee": 1050.9772312500002
          }
        }
      },
      {
        "id": "prime|PRI202450595137|Wilmans, Joshua",
        "client": "Wilmans, Joshua",
        "accountCode": "PRI202450595137",
        "identityNo": "0406055186083",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 46087.47
        },
        "zarAum": 46087.47,
        "holdingCount": 3,
        "holdings": [
          {
            "investment": "Coronation Global Emerging Markets Flexible (P)",
            "currency": "ZAR",
            "nativeValue": 10301.76,
            "zarValue": 10301.76
          },
          {
            "investment": "Wealthworks Prime Managed FOF (A)",
            "currency": "ZAR",
            "nativeValue": 24523.06,
            "zarValue": 24523.06
          },
          {
            "investment": "Centaur Bci Flexible Fund (C)",
            "currency": "ZAR",
            "nativeValue": 11262.65,
            "zarValue": 11262.65
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 9.60155625
            },
            "zarFee": 9.60155625
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 19.2031125
            },
            "zarFee": 19.2031125
          },
          "total": {
            "nativeFees": {
              "ZAR": 28.804668749999998
            },
            "zarFee": 28.804668749999998
          }
        }
      },
      {
        "id": "prime|PRI202204040005|Worrall, Charlie Christopher",
        "client": "Worrall, Charlie Christopher",
        "accountCode": "PRI202204040005",
        "identityNo": "1904295838082",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 1147723.38
        },
        "zarAum": 1147723.38,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 1147723.38,
            "zarValue": 1147723.38
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 239.1090375
            },
            "zarFee": 239.1090375
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 478.218075
            },
            "zarFee": 478.218075
          },
          "total": {
            "nativeFees": {
              "ZAR": 717.3271125
            },
            "zarFee": 717.3271125
          }
        }
      },
      {
        "id": "prime|PRI202204040006|Worrall, Isla Elizabeth",
        "client": "Worrall, Isla Elizabeth",
        "accountCode": "PRI202204040006",
        "identityNo": "1709010893084",
        "providerId": "prime",
        "providerName": "Prime Investments",
        "nativeValues": {
          "ZAR": 2790730.96
        },
        "zarAum": 2790730.96,
        "holdingCount": 1,
        "holdings": [
          {
            "investment": "Wealthworks Prime Managed Fund of Funds",
            "currency": "ZAR",
            "nativeValue": 2790730.96,
            "zarValue": 2790730.96
          }
        ],
        "fees": {
          "rebate": {
            "annualRate": 0.0025,
            "nativeFees": {
              "ZAR": 581.4022833333333
            },
            "zarFee": 581.4022833333333
          },
          "advisory": {
            "annualRate": 0.005,
            "nativeFees": {
              "ZAR": 1162.8045666666667
            },
            "zarFee": 1162.8045666666667
          },
          "total": {
            "nativeFees": {
              "ZAR": 1744.20685
            },
            "zarFee": 1744.20685
          }
        }
      }
    ]
  }
];
